
import EventEmitter from "events";
import TypedEmitter from "typed-emitter"

import R from "./preact-fabrics";

import game from "../engine/game";

import ClassesLoader from "./classes-loader";
import { KeyedMap, SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs from "thing-editor/src/editor/fs";
import DisplayObject, { DisplayObjectType } from "thing-editor/src/engine/display-object";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import Selection from "thing-editor/src/editor/utils/selection";
import historyInstance from "thing-editor/src/editor/utils/history";
import AssetsLoader from "thing-editor/src/editor/assets-loader";
import Settings from "thing-editor/src/engine/utils/settings";
import UI from "thing-editor/src/editor/ui/ui";
import { h, render } from "preact";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import Lib from "thing-editor/src/engine/lib";
import protectAccessToSceneNode from "thing-editor/src/editor/utils/protect-access-to-node";

type EditorEvents = {
	beforePropertyChanged: (o: DisplayObjectType, fieldName: string, field: EditablePropertyDesc, val: any, isDelta: boolean) => void,
	afterPropertyChanged: (body: string, from: string) => void
}


export default class Editor {

	currentProjectDir = '';
	editorArguments: KeyedMap<true> = {};
	projectDesc!: ProjectDesc;

	selection = new Selection();

	settings: Settings = new Settings('editor');

	disableFieldsCache: boolean = false;

	buildProjectAndExit: any; //TODO:

	//@ts-ignore
	events = new EventEmitter() as TypedEmitter<EditorEvents>;

	history = historyInstance;

	_lastChangedFiledName: string | null = null;

	ui!: UI;

	/** true when editor blocked fatally with un-closable error */
	__FatalError = false;

	projectOpeningInProgress = false;
	__projectReloading = false; //TODO:  rename to restartInProgress

	fs: any;
	overlay: any;


	readonly editorFilesPrefix = '.editor-tmp/';
	readonly backupSceneLibSaveSlotName = this.editorFilesPrefix + 'backup'; //TODO: rename to sceneBackupFileName

	constructor() {

		for(let arg of thingEditorServer.argv) {
			this.editorArguments[arg] = true;
		}

		this.onUIMounted = this.onUIMounted.bind(this);
		render(h(UI, { onUIMounted: this.onUIMounted }), document.body);

		game.editor = this;

		// load built in components
		fs.refreshAssetsList(['./thing-editor/src/engine/components']);
		ClassesLoader.reloadClasses(true).then(() => {

		});
	}

	onUIMounted(ui: UI) {
		this.ui = ui;
		game.__EDITOR_mode = true;
		this.openProject();
	}

	async openProject(dir?: string) {
		this.ui.viewport.stopExecution();
		await this.askSceneToSaveIfNeed();

		if(location.search && location.search.indexOf('?buildProjectAndExit=') === 0) {
			this.buildProjectAndExit = JSON.parse(decodeURIComponent(location.search.replace('?buildProjectAndExit=', '')));
			if(this.buildProjectAndExit) {
				window.addEventListener('error', function (errEv) {
					fs.exitWithResult(undefined, "UNCAUGHT ERROR: " + JSON.stringify(errEv, ["message", "filename", "lineno", "colno", "stack"]));
				});
				let errorOriginal = console.error;
				console.error = (txt) => {
					errorOriginal(txt);
					fs.exitWithResult(undefined, "CONSOLE ERROR CAPTURED: " + txt);
				};
			}
		}
		let lastOpenedProject = this.buildProjectAndExit ? this.buildProjectAndExit.projectName : this.settings.getItem('last-opened-project');
		if(!dir) {
			dir = lastOpenedProject;
		}
		if(!dir) {
			ProjectsList.chooseProject(true);
		} else if((dir + '/') !== this.currentProjectDir) {
			this.ui.modal.showSpinner();
			this.projectOpeningInProgress = true;
			this.settings.setItem('last-opened-project', dir);
			if(dir !== lastOpenedProject) {
				this.projectOpeningInProgress = false;
				this.__projectReloading = true;
				location.reload();
				return;
			}
			this.settings.setItem('last-opened-project', false);
			let data = await fs.readFile('/fs/openProject?dir=' + dir);
			if(!data) {
				this.projectOpeningInProgress = false;
				this.ui.modal.showError("Can't open project " + dir).then(() => { this.openProject(); });
				return;
			}
			await this.fs.refreshFiles();
			this.currentProjectDir = dir + '/';


			let folderSettings;
			let imagesSettings;

			if(this.fs.libsSettings) {
				folderSettings = this.fs.libsSettings.__loadOnDemandTexturesFolders;
				imagesSettings = this.fs.libsSettings.loadOnDemandTextures;
			}

			this.projectDesc = this.fs.libsSettings ? Object.assign(this.fs.libsSettings, data) : data;

			if(folderSettings) {
				this.fs.libsSettings.__loadOnDemandTexturesFolders = Object.assign(folderSettings, this.projectDesc.__loadOnDemandTexturesFolders);
			}
			if(imagesSettings) {
				this.fs.libsSettings.loadOnDemandTextures = Object.assign(imagesSettings, this.projectDesc.loadOnDemandTextures);
			}

			this.settings.setItem(dir + '_EDITOR_lastOpenTime', Date.now());

			let isProjectDescriptorModified = game.applyProjectDesc(this.projectDesc);

			await game.init(window.document.getElementById('viewport-root'), 'editor.' + this.projectDesc.id, '/games/' + dir + '/');

			game.stage.interactiveChildren = false;

			//	this.overlay = new Overlay();
			await Promise.all([this.reloadAssetsAndClasses()]);

			this.settings.setItem('last-opened-project', dir);

			if(isProjectDescriptorModified) {
				this.saveProjectDesc();
			} else {
				this.__saveProjectDescriptorInner(true); // try to cleanup descriptor
			}

			protectAccessToSceneNode(game.stage, "game stage");
			protectAccessToSceneNode(game.stage.parent, "PIXI stage");


			if(this.projectDesc.__lastSceneName && !Lib.hasScene(this.projectDesc.__lastSceneName)) {
				this.projectDesc.__lastSceneName = false;
			}

			if(!this.buildProjectAndExit && Lib.hasScene(this.backupSceneLibSaveSlotName)) {
				//backup restoring
				this.ui.modal.showEditorQuestion("Scene's backup restoring (" + this.projectDesc.title + ")",
					R.fragment(R.div(null, "Looks like previous session was finished incorrectly."),
						R.div(null, "Do you want to restore scene from backup?")),
					async () => {
						await this.openSceneSafe(this.backupSceneLibSaveSlotName);
						this.history.currentState.treeData._isModified = true;

					}, 'Restore backup',
					async () => {
						await this.openSceneSafe(this.projectDesc.__lastSceneName || 'main');
						Lib.__deleteScene(this.backupSceneLibSaveSlotName);
					}, 'Delete backup',
					true
				);
			} else {//open last project's scene
				await this.openSceneSafe(!this.buildProjectAndExit && this.projectDesc.__lastSceneName || this.projectDesc.mainScene || 'main');
				if(this.buildProjectAndExit) {
					this.testProject().then(() => {
						this.build().then(() => {
							this.build(true).then(() => {
								fs.exitWithResult('build complete');
							});
						});
					});
				}
			}
			this.regeneratePrefabsTypings();
			this.ui.modal.hideSpinner();

			this.projectOpeningInProgress = false;
		}
	}

	async testProject() {
		//TODO:

	}

	async build(_isDebugBuild = false) {
		//TODO:
	}

	saveProjectDesc() {
		//TODO:

	}

	async openSceneSafe(_sceneName: string) {
		//TODO
	}

	askSceneToSaveIfNeed() {
		//TODO:
	}

	regeneratePrefabsTypings() {
		//TODO:
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

	async reloadAssetsAndClasses() {
		await ClassesLoader.reloadClasses();
		await AssetsLoader.reloadAssets();
	}

	showError(message: string, _errorCode = 99999) {
		alert(message); //TODO:
	}

	logError(message: string, _errorCode = 99999, _owner?: DisplayObjectType | (() => any), _fieldName?: string) {
		alert(message); //TODO:
	}

	warn(message: string, _errorCode = 99999, _owner?: DisplayObjectType | (() => any), _fieldName?: string) {
		alert(message); //TODO:
	}

	notify(message: string | preact.Component) {
		alert(message); //TODO:
	}

	selectField(_fieldName: string) {
		//TODO:
	}

	refreshTreeViewAndPropertyEditor() {
		//TODO:
	}

	getFieldNameByValue(node: SourceMappedConstructor, fieldValue: any) {
		if(node instanceof DisplayObject) {
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

	editClassSource(c: SourceMappedConstructor | DisplayObjectType) {
		if(this.editorArguments['no-vscode-integration']) {
			return;
		}
		if(c instanceof DisplayObject) {
			c = c.constructor as SourceMappedConstructor;
		}
		let filePath = c.__sourceFileName as string;
		fs.editFile(filePath);
	}

	protected __saveProjectDescriptorInner(_cleanupOnly = false) {
		//TODO: cleanup take from 1.0
		this.fs.saveFile(this.currentProjectDir + 'thing-project.json', this.projectDesc);
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