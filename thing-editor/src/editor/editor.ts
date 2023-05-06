
import EventEmitter from "events";
import TypedEmitter from "typed-emitter"

import R from "./preact-fabrics";

import game from "../engine/game";

import ClassesLoader from "./classes-loader";
import { KeyedMap, SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs from "thing-editor/src/editor/fs";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import Selection, { SelectionData } from "thing-editor/src/editor/utils/selection";
import historyInstance from "thing-editor/src/editor/utils/history";
import AssetsLoader from "thing-editor/src/editor/assets-loader";
import Settings from "thing-editor/src/engine/utils/settings";
import UI from "thing-editor/src/editor/ui/ui";
import { ComponentChild, h, render } from "preact";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import Lib from "thing-editor/src/engine/lib";
import protectAccessToSceneNode from "thing-editor/src/editor/utils/protect-access-to-node";

import debouncedCall from "thing-editor/src/editor/utils/debounced-call";
import Pool from "thing-editor/src/engine/utils/pool";
import assert from "thing-editor/src/engine/debug/assert";
import { Container, Texture } from "pixi.js";

type EditorEvents = {
	beforePropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta: boolean) => void,
	afterPropertyChanged: (body: string, from: string) => void
}


export default class Editor {

	currentProjectDir = '';
	editorArguments: KeyedMap<true> = {};
	projectDesc!: ProjectDesc;

	selection = new Selection();

	settings: Settings = new Settings('editor');

	disableFieldsCache: boolean = false;
	isCurrentSceneModified: boolean = false;

	buildProjectAndExit: any; //TODO:

	//@ts-ignore
	events = new EventEmitter() as TypedEmitter<EditorEvents>;

	history = historyInstance;

	_lastChangedFiledName: string | null = null;

	savedBackupName?: string | null;
	savedBackupSelectionData?: SelectionData;

	ui!: UI;

	/** true when editor blocked fatally with un-closable error */
	__FatalError = false;

	__projectReloading = false; //TODO:  rename to restartInProgress

	overlay: any; //TODO:

	__wrongTexture = Texture.from('img/wrong-texture.png');

	readonly editorFilesPrefix = '.editor-tmp/';
	readonly backupSceneLibSaveSlotName = this.editorFilesPrefix + 'backup'; //TODO: implement it rename to sceneBackupFileName

	constructor() {

		for(let arg of thingEditorServer.argv) {
			this.editorArguments[arg] = true;
		}

		this.onUIMounted = this.onUIMounted.bind(this);
		render(h(UI, { onUIMounted: this.onUIMounted }), document.body);

		game.editor = this;
		game.__EDITOR_mode = true;

		this.__saveProjectDescriptorInner = this.__saveProjectDescriptorInner.bind(this);
	}

	onUIMounted(ui: UI) {
		this.ui = ui;
		// load built in components
		fs.refreshAssetsList(['thing-editor/src/engine/components']);
		ClassesLoader.reloadClasses(true).then(() => {
			if(this.settings.getItem('last-opened-project')) {
				this.openProject(this.settings.getItem('last-opened-project'));
			} else {
				this.chooseProject(true);
			}
		});
	}

	chooseProject(noClose = false) {
		ProjectsList.chooseProject(noClose).then((dir) => {
			this.settings.setItem('last-opened-project', dir);
			window.document.location.reload();
		});
	}

	async openProject(dir?: string) {
		this.ui.viewport.stopExecution();
		await this.askSceneToSaveIfNeed();

		const newProjectDir = 'games/' + dir + '/';
		if(newProjectDir !== this.currentProjectDir) {
			this.currentProjectDir = newProjectDir;
			this.ui.modal.showSpinner();
			this.settings.removeItem('last-opened-project');
			this.projectDesc = fs.readFile(this.currentProjectDir + 'thing-project.json');
			if(!this.projectDesc) {
				this.ui.modal.showError("Can't open project " + dir).then(() => { this.openProject(); });
				return;
			}

			//TODO libs settings-merge to current

			this.settings.setItem(dir + '_EDITOR_lastOpenTime', Date.now());
			let isProjectDescriptorModified = game.applyProjectDesc(this.projectDesc);


			await game.init(window.document.getElementById('viewport-root'), 'editor.' + this.projectDesc.id, '/games/' + dir + '/');
			game.stage.interactiveChildren = false;
			protectAccessToSceneNode(game.stage, "game stage");
			protectAccessToSceneNode(game.stage.parent, "PIXI stage");

			//	this.overlay = new Overlay(); //TODO:
			await Promise.all([this.reloadAssetsAndClasses(true)]);

			this.settings.setItem('last-opened-project', dir);

			if(isProjectDescriptorModified) {
				this.saveProjectDesc();
			} else {
				this.__saveProjectDescriptorInner(true); // try to cleanup descriptor
			}

			if(this.projectDesc.__lastSceneName && !Lib.hasScene(this.projectDesc.__lastSceneName)) {
				this.projectDesc.__lastSceneName = false;
			}

			this.openScene(this.projectDesc.__lastSceneName || this.projectDesc.mainScene || 'main');

			this.regeneratePrefabsTypings();
			this.ui.modal.hideSpinner();
		}
	}

	async testProject() {
		//TODO:

	}

	async build(_isDebugBuild = false) {
		//TODO:
	}

	saveProjectDesc() {
		debouncedCall(this.__saveProjectDescriptorInner);
	}

	openScene(name: string) {
		this.askSceneToSaveIfNeed();

		Pool.__resetIdCounter();
		assert(name, 'name should be defined');
		this.saveCurrentScenesSelectionGlobally();

		game.showScene(name);

		game.currentContainer.__nodeExtendData.childrenExpanded = true;

		this.regeneratePrefabsTypings();

		document.title = '(' + this.projectDesc.title + ') - - (' + name + ')';
		this.saveCurrentSceneName(game.currentScene.name as string);
		if(game.currentScene) {
			this.selection.loadSelection(game.settings.getItem('__EDITOR_scene_selection' + this.currentSceneName));
		}

		this.history.setCurrentStateUnmodified();
		this.ui.forceUpdate();
	}

	saveCurrentScenesSelectionGlobally() {
		if(game.currentScene) {
			game.settings.setItem('__EDITOR_scene_selection' + this.currentSceneName, this.selection.saveSelection());
		}
	}

	askSceneToSaveIfNeed() {
		this.ui.viewport.stopExecution();
		if(this.isCurrentSceneModified) {
			if(fs.showQueston("Unsaved changes.", "Do you want to save changes in current scene?", "Save", "Discard")) {
				this.saveCurrentScene();
			}
		}
	}

	regeneratePrefabsTypings() {
		//TODO:
	}

	loadScene(_name: string) {
		//TODO
	}

	saveCurrentScene() {
		//TODO
	}

	get currentSceneName() {
		return this.projectDesc ? this.projectDesc.__lastSceneName : null;
	}

	openUrl(url: string) {
		if(!window.open(url)) {
			this.ui.modal.showInfo(R.div(null,
				"click to open: ",
				R.a({ href: url, target: '_blank' }, url),
				R.br(),
				"Check browser's status bar to allow automatic opening after build."
			), "building finished.", 30011);
		}
	}

	//TODO: set diagnosticLevel settings to informations to show spell typos and fix them after all

	async reloadAssetsAndClasses(refreshAssetsList = false) {
		if(refreshAssetsList) {
			fs.refreshAssetsList([this.currentProjectDir + 'assets']);
		}
		await ClassesLoader.reloadClasses();
		await AssetsLoader.reloadAssets();
	}

	onObjectsPropertyChanged(_o: Container, _field: string, _val: any, _isDelta?: boolean) {
		//TODO:
	}

	showError(message: ComponentChild, errorCode = 99999) {
		this.ui.modal.showError(message, errorCode);
	}

	logError(message: string, _errorCode = 99999, _owner?: Container | (() => any), _fieldName?: string) {
		debugger;
		alert(message); //TODO:
	}

	warn(message: string, _errorCode = 99999, _owner?: Container | (() => any), _fieldName?: string) {
		debugger;
		alert(message); //TODO:
	}

	notify(message: string | preact.Component) {
		debugger;
		alert(message); //TODO:
	}

	selectField(_fieldName: string) {
		//TODO:
	}

	refreshTreeViewAndPropertyEditor() {
		//TODO:
	}

	getFieldNameByValue(node: Container, fieldValue: any) {
		if(node instanceof Container) {
			for(let p of node.__editableProps) {
				//@ts-ignore
				if(node[p.name] === fieldValue) {
					return p.name;
				}
			}
		}
	}

	copyToClipboard(text: string) {
		navigator.permissions.query({
			//@ts-ignore
			name: 'clipboard-read'
		}).then(() => {
			navigator.clipboard.writeText(text).then(() => {
				this.notify(R.span(null, R.icon('copy'), '"' + text + '"'));
			});
		});
	}

	editClassSource(c: SourceMappedConstructor | Container) {
		if(this.editorArguments['no-vscode-integration']) {
			return;
		}
		if(c instanceof Container) {
			c = c.constructor as SourceMappedConstructor;
		}
		let filePath = c.__sourceFileName as string;
		fs.editFile(filePath);
	}

	protected saveCurrentSceneName(name: string) {
		if(this.projectDesc.__lastSceneName !== name) {
			this.projectDesc.__lastSceneName = name;
			this.saveProjectDesc();
		}
	}

	protected __saveProjectDescriptorInner(_cleanupOnly = false) {
		//TODO: cleanup take from 1.0
		fs.saveFile(this.currentProjectDir + 'thing-project.json', this.projectDesc);
	}
}


window.addEventListener('keydown', (ev) => {

	if(ev.code === 'F5') {
		window.location.reload();
	} else if(ev.code === 'F12') {
		fs.toggleDevTools();
	}
});




new Editor();