
import EventEmitter from "events";
import TypedEmitter from "typed-emitter";

import R from "./preact-fabrics";

import game from "../engine/game";

import { Component, ComponentChild, h, render } from "preact";
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import AssetsLoader from "thing-editor/src/editor/assets-loader";
import { KeyedMap, KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs, { AssetType } from "thing-editor/src/editor/fs";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import UI from "thing-editor/src/editor/ui/ui";
import historyInstance from "thing-editor/src/editor/utils/history";
import protectAccessToSceneNode from "thing-editor/src/editor/utils/protect-access-to-node";
import Selection, { SelectionData } from "thing-editor/src/editor/utils/selection";
import Lib from "thing-editor/src/engine/lib";
import Settings from "thing-editor/src/engine/utils/settings";
import ClassesLoader from "./classes-loader";

import { Container, Point, Texture } from "pixi.js";
import initializeOverlay from "thing-editor/src/editor/ui/editor-overlay";
import debouncedCall from "thing-editor/src/editor/utils/debounced-call";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import { __UnknownClass, __UnknownClassScene } from "thing-editor/src/editor/utils/unknown-class";
import assert from "thing-editor/src/engine/debug/assert";
import Pool from "thing-editor/src/engine/utils/pool";

function addTo(parent: Container, child: Container, doNotSelect = false) {
	parent.addChild(child);
	Lib.__invalidateSerializationCache(child);
	if(!doNotSelect) {
		editor.ui.sceneTree.selectInTree(child);
		editor.sceneModified(true);
	}
	Lib.__callInitIfGameRuns(child);
}


type EditorEvents = {
	beforePropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void,
	afterPropertyChanged: (o: Container, fieldName: string, field: EditablePropertyDesc, val: any, isDelta?: boolean) => void,
}

let refreshTreeViewAndPropertyEditorScheduled = false;

class Editor {

	currentProjectDir = '';
	editorArguments: KeyedMap<true | string> = {};
	projectDesc!: ProjectDesc;

	selection = new Selection();

	settings: Settings = new Settings('editor');

	disableFieldsCache: boolean = false;

	buildProjectAndExit: any; //TODO:

	//@ts-ignore
	events = new EventEmitter() as TypedEmitter<EditorEvents>;

	history = historyInstance;

	_lastChangedFiledName: string | null = null;

	savedBackupName?: string | null;
	savedBackupSelectionData?: SelectionData;

	/** editor space mouse coord X */
	mouseX: number = 0;
	/** editor space mouse coord Y */
	mouseY: number = 0;

	ui!: UI;

	/** true when editor blocked fatally with un-closable error */
	__FatalError = false;

	__projectReloading = false; //TODO:  rename to restartInProgress

	__wrongTexture = Texture.from('img/wrong-texture.png');

	readonly backupPrefix = '.editor-backup/';

	constructor() {

		for(let arg of window.thingEditorServer.argv) {
			if(arg.startsWith('--') && arg.indexOf('=') > 0) {
				const a = arg.split('=');
				this.editorArguments[a[0].substring(2)] = a[1];
			} else {
				this.editorArguments[arg] = true;
			}
		}

		this.onUIMounted = this.onUIMounted.bind(this);
		game.editor = this;

		game.__EDITOR_mode = true;
		render(h(UI, { onUIMounted: this.onUIMounted }), document.getElementById('root') as HTMLElement);

		this.__saveProjectDescriptorInner = this.__saveProjectDescriptorInner.bind(this);
		this.onSelectedPropsChange = this.onSelectedPropsChange.bind(this);
		initializeOverlay();
	}

	get currentProjectAssetsDir() {
		return this.currentProjectDir + 'assets/';
	}

	onUIMounted(ui: UI) {
		this.ui = ui;
		// load built in components

		if(this.settings.getItem('last-opened-project')) {
			this.openProject(this.settings.getItem('last-opened-project'));
		} else {
			this.chooseProject(true);
		}

		window.onbeforeunload = (e) => {

			PrefabEditor.acceptPrefabEdition();
			if(!game.__EDITOR_mode) { //backup already exist
				return;
			}
			if(!this.__projectReloading) {
				if(this.askSceneToSaveIfNeed() === false) {
					e.returnValue = false;
				}
			}
		};

		setInterval(() => { //keep props editor and tree actual during scene is launched
			if(!game.__EDITOR_mode && !game.__paused) {
				this.refreshTreeViewAndPropertyEditor();
			}
		}, 300);
	}

	get isCurrentSceneModified() {
		assert(game.__EDITOR_mode, "access to isCurrentSceneModified in running mode.");
		if(game.currentScene !== game.currentContainer) {
			this.showError("access to isCurrentSceneModified in prefab mode", 90001);
		}
		return this.isCurrentContainerModified;
	}

	get isCurrentContainerModified() {
		return this.history.isStateModified;
	}

	assetNameToBackupName(assetName: string, assetType: AssetType): string {
		return fs.assetNameToFileName(assetName, assetType).replace(assetName, this.backupPrefix + assetName);
	}

	reloadClasses() {

		this.ui.viewport.stopExecution();

		let needRestoring = game.currentScene;
		if(needRestoring) {
			this.saveBackup();
		}

		return ClassesLoader.reloadClasses().then(() => {
			ClassesLoader.validateClasses();
			if(needRestoring) {
				editor.restoreBackup();
			}
		});
	}

	saveBackup() {
		if(!this.isCurrentSceneModified) {
			return;
		}
		this.saveCurrentScene(this.assetNameToBackupName(this.currentSceneName, AssetType.SCENE));
	}

	restoreBackup() {
		const backupName = this.assetNameToBackupName(this.currentSceneName, AssetType.SCENE);
		if(Lib.hasScene(backupName)) {
			editor.openScene(backupName);
			editor.sceneModified();
		} else {
			editor.openScene(this.currentSceneName);
		}
	}

	onSelectedPropsChange(field: EditablePropertyDesc | string, val: any, delta?: boolean) {
		if(this.selection.length > 0) {

			if(typeof field === 'string') {
				field = this.getObjectField(this.selection[0], field);
			}
			if(field.beforeEdited) {
				field.beforeEdited(val);
			}

			for(let o of this.selection) {
				this.onObjectsPropertyChanged(o, field, val, delta);
			}
			if(field.afterEdited) {
				field.afterEdited();
			}
		}
	}

	getObjectField(o: Container, name: string): EditablePropertyDesc {
		const ret = (o.constructor as SourceMappedConstructor).__editableProps.find((f) => {
			return f.name === name;
		}) as EditablePropertyDesc;
		assert(ret, "Unknown editable propery name: " + name);
		return ret;
	}

	chooseProject(noClose = false) {
		ProjectsList.chooseProject(noClose).then((dir: string) => {
			this.settings.setItem('last-opened-project', dir);
			this.__projectReloading = true;
			window.document.location.reload();
		});
	}

	pauseGame() {
		if(!game.__paused && !game.__EDITOR_mode) {
			game.__paused = true;
			this.ui.viewport.refresh();
		}
	}

	async openProject(dir?: string) {
		this.ui.viewport.stopExecution();
		if(this.askSceneToSaveIfNeed()) {

			const newProjectDir = 'games/' + dir + '/';
			if(newProjectDir !== this.currentProjectDir) {
				this.currentProjectDir = newProjectDir;
				this.ui.modal.showSpinner();
				this.settings.removeItem('last-opened-project');
				this.projectDesc = fs.readJSONFile(this.currentProjectDir + 'thing-project.json');
				if(!this.projectDesc) {
					this.ui.modal.showError("Can't open project " + dir).then(() => { this.openProject(); });
					return;
				}

				//TODO libs settings-merge to current

				this.settings.setItem(dir + '_EDITOR_lastOpenTime', Date.now());
				let isProjectDescriptorModified = game.applyProjectDesc(this.projectDesc);


				game.init(window.document.getElementById('viewport-root'), 'editor.' + this.projectDesc.id, '/games/' + dir + '/');
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
				this.projectDesc.__lastSceneName = this.projectDesc.__lastSceneName || this.projectDesc.mainScene || 'main';
				this.restoreBackup();

				this.regeneratePrefabsTypings();
				this.ui.modal.hideSpinner();
			}
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
		if(this.askSceneToSaveIfNeed()) {

			Pool.__resetIdCounter();

			assert(name, 'name should be defined');

			game.showScene(name);

			game.currentContainer.__nodeExtendData.childrenExpanded = true;


			document.title = '(' + this.projectDesc.title + ') - - (' + name + ')';
			this.saveCurrentSceneName(game.currentScene.name as string);
			if(game.currentScene) {
				this.selection.loadCurrentSelection();
			}
			this.history.setCurrentStateUnmodified();
			this.regeneratePrefabsTypings();
			this.ui.refresh();
		}
	}

	/** if returns false - cancel operation */
	askSceneToSaveIfNeed(): boolean {
		this.ui.viewport.stopExecution();
		if(this.isCurrentSceneModified) {
			let ansver = fs.showQueston(
				"Unsaved changes.",
				"Do you want to save changes in '" + this.currentSceneName + "' scene?",
				"Save",
				"Discard",
				"Cancel"
			);
			if(ansver === 0) {
				this.saveCurrentScene();
			} else if(ansver === 2) {
				return false;
			}
		} else {
			if(game.currentScene) {
				this.selection.saveCurrentSelection();
			}
		}
		return true;
	}

	attachToSelected(o: Container, doNotSelect = false) {
		if(this.selection.length > 0) {
			addTo(this.selection[0], o, doNotSelect);
		} else {
			this.addToScene(o, doNotSelect);
		}
	}

	addToScene(o: Container, doNotSelect = false) {
		addTo(game.currentContainer, o, doNotSelect);
	}

	isCanBeAddedAsChild(Class: SourceMappedConstructor): boolean {
		if(editor.selection.length !== 1) {
			return false;
		}
		let o = editor.selection[0];
		if((o.constructor as SourceMappedConstructor).__canAcceptChild) {
			return (o.constructor as SourceMappedConstructor).__canAcceptChild(Class);
		}
		return true;
	}

	regeneratePrefabsTypings() {
		//TODO:
	}

	_getProjectViewportSize(doNotFixOrientation = false) {
		if(game.projectDesc.screenOrientation === 'auto') {
			if(!doNotFixOrientation) {
				game.___enforcedOrientation = 'landscape';
			}
			return {
				w: game.projectDesc.width,
				h: game.projectDesc.height
			};
		} else if(game.projectDesc.screenOrientation === 'portrait') {
			return {
				w: game.projectDesc.portraitWidth,
				h: game.projectDesc.portraitHeight
			};
		} else {
			return {
				w: game.projectDesc.width,
				h: game.projectDesc.height
			};
		}
	}

	_callInPortraitMode(callback: () => void) {
		let tmpOrientation = game.___enforcedOrientation;
		let tmpIsMobile = game.isMobile.any;
		game.isMobile.any = false;
		let size = this._getProjectViewportSize();
		game.__enforcedW = size.w;
		game.__enforcedH = size.h;

		game.onResize();
		callback();
		game.___enforcedOrientation = tmpOrientation;
		delete game.__enforcedW;
		delete game.__enforcedH;
		game.isMobile.any = tmpIsMobile;
		game.onResize();
	}

	saveCurrentScene(name: string = this.currentSceneName) {
		/*for(let f of editor.checkSceneHandlers) { //TODO
			f();
		}*/

		this.ui.viewport.stopExecution();

		assert(name, "Name can't be empty");
		assert(game.__EDITOR_mode, "tried to save scene in running mode.");
		if(this.isCurrentSceneModified || (this.currentSceneName !== name)) {

			this.history.setCurrentStateUnmodified();
			this.saveCurrentSceneName(name);
			this._callInPortraitMode(() => {
				Lib.__saveScene(game.currentScene, name);
				this.selection.saveCurrentSelection();
			});
		}
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

	sceneModified(saveImmediately: boolean = false) {
		this.history._sceneModifiedInner(saveImmediately);
	}

	moveContainerWithoutChildren(o: Container, dX: number, dY: number) {
		for(let c of o.children) {
			let p = c.getGlobalPosition();
			c.__nodeExtendData.tmpGlobalPos = p;
			let p2 = o.toLocal(p);
			if(isNaN(p2.x) || isNaN(p2.y)) {
				this.ui.status.warn("Object has zero scale and can not be moved without affecting children`s positions.", 30023, o);
				return;
			}
		}
		this.shiftObject(o, dX, dY);
		for(let c of o.children) {
			let p = o.toLocal(c.__nodeExtendData.tmpGlobalPos as Point);
			this.shiftObject(c as Container, Math.round(p.x - c.x), Math.round(p.y - c.y));
		}
	}

	shiftObject(o: Container, dX: number, dY: number) {
		if(dX !== 0 || dY !== 0) {
			// Shift wrapped object to zero. If it is MovieClip its will shift all timeline.

			/*if(o.__shiftObject) { //TODO  сдвиг ориентейшн тригера
				o.__shiftObject(dX, dY);
			} else {*/

			//TODO Timeline.disableRecording();
			if(dX !== 0) {
				this.onObjectsPropertyChanged(o, 'x', dX, true);
			}
			if(dY !== 0) {
				this.onObjectsPropertyChanged(o, 'y', dY, true);
			}
			//TODO Timeline.enableRecording();
			//}
		}
	}

	//TODO: set diagnosticLevel settings to informations to show spell typos and fix them after all

	async reloadAssetsAndClasses(refreshAssetsList = false) {
		if(refreshAssetsList) {
			fs.refreshAssetsList(['thing-editor/src/engine/components/', this.currentProjectAssetsDir]);
		}
		await this.reloadClasses();
		await AssetsLoader.reloadAssets();
	}

	onObjectsPropertyChanged(o: Container, field: EditablePropertyDesc | string, val: any, isDelta?: boolean) {
		assert((!isDelta) || (typeof isDelta === 'boolean'), "isDelta expected to be bool");
		let changed = false;
		if(typeof field === 'string') {
			field = this.getObjectField(o, field);
		}

		this.events.emit('beforePropertyChanged', o, field.name, field, val, isDelta);

		if(isDelta) {
			assert(field.type === 'number', "editable field descriptor type: Number expected");

			let v = (o as KeyedObject)[field.name];
			let newVal = v + val;
			if(field.hasOwnProperty('min')) {
				newVal = Math.max(field.min as number, newVal);
			}
			if(field.hasOwnProperty('max')) {
				newVal = Math.min(field.max as number, newVal);
			}
			if(v !== newVal) {
				(o as KeyedObject)[field.name] = newVal;
				changed = true;
			}
		} else {
			if((o as KeyedObject)[field.name] !== val) {
				(o as KeyedObject)[field.name] = val;
				changed = true;
			}
		}

		this.events.emit('afterPropertyChanged', o, field.name, field, val, isDelta);

		if(changed) {
			Lib.__invalidateSerializationCache(o);
			this.refreshTreeViewAndPropertyEditor();
			this._lastChangedFiledName = field.name;
			this.sceneModified(false);
		}
		return changed;
	}

	showError(message: ComponentChild, errorCode = 99999) {
		this.ui.modal.showError(message, errorCode);
	}

	notify(message: string | Component) {
		this.ui.modal.notify(message);
	}

	selectField(_fieldName: string) {
		//TODO:
	}

	refreshTreeViewAndPropertyEditor() {
		if(refreshTreeViewAndPropertyEditorScheduled || document.fullscreenElement) return;
		refreshTreeViewAndPropertyEditorScheduled = true;
		setTimeout(() => {
			refreshTreeViewAndPropertyEditorScheduled = false;
			this.ui.sceneTree.refresh();
			this.refreshPropsEditor();
		}, 1);
	}

	refreshPropsEditor() {
		this.ui.propsEditor.refresh();
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

	editSource(fileName: string, line?: number, char?: number) {
		if(this.editorArguments['no-vscode-integration']) {
			return;
		}
		if(line !== undefined) {
			fileName += ':' + line;
			if(char !== undefined) {
				fileName += ':' + char;
			}
		}
		let rootPath: string = thingEditorServer.argv[0].split('node_modules')[0];
		rootPath = rootPath.substring(0, rootPath.length - 1);
		let url = '/__open-in-editor?file=' + rootPath + fileName;
		fetch(url);
	}

	editClassSource(c: SourceMappedConstructor | Container, className: string = '') {
		if(c instanceof Container) {
			c = c.constructor as SourceMappedConstructor;
		}
		if(!c || (c as any) === __UnknownClass || (c as any) === __UnknownClassScene) {
			game.editor.ui.modal.showError("Object has unknown type '" + className + "', and has no source code. Probably source code was removed.")
			return;
		}

		this.editSource(c.__sourceFileName as string);
	}

	protected saveCurrentSceneName(name: string) {
		if(name.indexOf(this.backupPrefix) < 0) {
			if(this.projectDesc.__lastSceneName !== name) {
				this.projectDesc.__lastSceneName = name;
				this.saveProjectDesc();
			}
		}
	}

	protected __saveProjectDescriptorInner(_cleanupOnly = false) {
		//TODO: cleanup take from 1.0
		fs.saveFile(this.currentProjectDir + 'thing-project.json', this.projectDesc);
	}
}

const editor = new Editor();

type __EditorType = typeof editor;

export type { __EditorType }; // hide Editor from intellisense
