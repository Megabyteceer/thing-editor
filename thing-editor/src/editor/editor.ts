import R from "./preact-fabrics";

import game from "../engine/game";

import { Component, ComponentChild, h, render } from "preact";
import AssetsLoader from "thing-editor/src/editor/assets-loader";
import { KeyedMap, KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs, { AssetType, FileDesc, FileDescClass, LibInfo } from "thing-editor/src/editor/fs";
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
import { ProjectDesc } from "thing-editor/src/editor/ProjectDesc";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import debouncedCall from "thing-editor/src/editor/utils/debounced-call";
import { editorEvents } from "thing-editor/src/editor/utils/editor-events";
import { EDITOR_BACKUP_PREFIX } from "thing-editor/src/editor/utils/flags";
import mergeProjectDesc from "thing-editor/src/editor/utils/merge-project-desc";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import { __UnknownClass, __UnknownClassScene } from "thing-editor/src/editor/utils/unknown-class";
import assert from "thing-editor/src/engine/debug/assert";
import defaultProjectDesc from "thing-editor/src/engine/utils/default-project-desc";
import Pool from "thing-editor/src/engine/utils/pool";
import Sound from "thing-editor/src/engine/utils/sound";

let refreshTreeViewAndPropertyEditorScheduled = false;

const LAST_SCENE_NAME = '__EDITOR_last_scene_name';

const parseLibName = (name: string): LibInfo => {
	let dir;
	if(name.startsWith('.')) {
		dir = new URL(name, window.location.origin + '/' + game.editor.currentProjectDir).pathname.substring(1);
	} else {
		dir = 'libs/' + name;
	}
	return {
		name,
		dir,
		assetsDir: dir + '/assets/'
	};
}

class Editor {

	currentProjectDir = '';
	currentProjectAssetsDir = '';
	currentProjectAssetsDirRooted = '';
	assetsFolders!: string[];
	libsDescs: KeyedMap<ProjectDesc> = {};
	libsProjectDescMerged!: ProjectDesc;

	editorArguments: KeyedMap<true | string> = {};
	projectDesc!: ProjectDesc;

	selection = new Selection();

	settings: Settings = new Settings('editor');

	disableFieldsCache: boolean = false;

	buildProjectAndExit: any; //TODO:


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

	isProjectOpen = false;

	currentPathChoosingField?: EditablePropertyDesc;

	currentProjectLibs!: LibInfo[];

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
		this.reloadClasses = this.reloadClasses.bind(this);
	}

	onUIMounted(ui: UI) {
		setTimeout(() => {

			this.ui = ui;
			// load built in components

			if(this.settings.getItem('last-opened-project')) {
				this.openProject(this.settings.getItem('last-opened-project'));
			} else {
				this.chooseProject(true);
			}

			window.onbeforeunload = (e) => {
				if(!this.__projectReloading && !this.__FatalError) {
					if(this.askSceneToSaveIfNeed() === false) {
						e.returnValue = false;
					}
				}
			};

			window.onbeforeunload = (e) => {
				if(!this.__projectReloading && !this.__FatalError) {
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
		}, 0);
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

	reloadClasses() {

		this.ui.viewport.stopExecution();

		let needRestoring = game.currentScene;
		if(needRestoring) { // TODO save prefab and restore prefab if it is prefab edition
			this.saveBackup();
		}

		return ClassesLoader.reloadClasses().then(() => {
			ClassesLoader.validateClasses();
			if(needRestoring) {
				this.restoreBackup();
			}
		});
	}

	onEditorRenderResize() {
		this.refreshTreeViewAndPropertyEditor();
		this.ui.viewport.forceUpdate();
	}

	saveBackup() {
		if(!this.isCurrentSceneModified) {
			return;
		}
		this.saveCurrentScene(this.currentSceneBackupName);
	}

	restoreBackup() {
		const backupName = this.currentSceneBackupName;
		if(Lib.hasScene(backupName)) {
			this.openScene(backupName);
			Lib.__deleteScene(backupName);
			this.history.setCurrentStateModified();
		} else {
			this.openScene(this.currentSceneName);
		}
	}

	onSelectedPropsChange(field: EditablePropertyDesc | string, val: any, delta?: boolean) { //TODO rename changeProperty
		if(this.selection.length > 0) {

			if(typeof field === 'string') {
				field = this.getObjectField(this.selection[0], field);
			}

			assert(this.ui.propsEditor.editableProps[field.name], "Property is disabled.");

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

	chooseProject(notSkipable = false) {
		ProjectsList.__chooseProject(notSkipable).then((dir: string) => {
			if(dir && dir != this.settings.getItem('last-opened-project')) {
				this.settings.setItem('last-opened-project', dir);
				this.__projectReloading = true;
				this.openProject(dir);
			}
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

			if(!dir) {
				this.chooseProject(true);
				return;
			}
			const newProjectDir = 'games/' + dir + '/';

			if(newProjectDir !== this.currentProjectDir) {
				this.currentProjectDir = newProjectDir;
				this.currentProjectAssetsDir = this.currentProjectDir + 'assets/';
				this.currentProjectAssetsDirRooted = '/' + this.currentProjectAssetsDir;

				this.ui.modal.showSpinner();
				this.settings.removeItem('last-opened-project');
				const projectDesc = fs.readJSONFile(this.currentProjectDir + 'thing-project.json');
				if(!projectDesc) {
					this.ui.modal.showError("Can't open project " + dir).then(() => { this.chooseProject(true); });
					return;
				}

				this.assetsFolders = ['thing-editor/src/engine/components/'];
				this.libsProjectDescMerged = {} as ProjectDesc;
				mergeProjectDesc(this.libsProjectDescMerged, defaultProjectDesc);

				this.currentProjectLibs = projectDesc.libs.map(parseLibName);

				for(let lib of this.currentProjectLibs) {
					this.assetsFolders.push(lib.assetsDir);
					this.libsDescs[lib.name] = fs.readJSONFile(lib.dir + '/thing-lib.json');
					mergeProjectDesc(this.libsProjectDescMerged, this.libsDescs[lib.name]);
				}

				this.assetsFolders.push(this.currentProjectAssetsDir);

				this.settings.setItem(dir + '_EDITOR_lastOpenTime', Date.now());

				this.projectDesc = {} as ProjectDesc;
				mergeProjectDesc(this.projectDesc, this.libsProjectDescMerged);
				mergeProjectDesc(this.projectDesc, projectDesc);

				if(excludeOtherProjects()) {
					this.__projectOpenWasFine(dir);
					this.__projectReloading = true;
					return; // window will be reloaded by vite.js because of tsconfig change.
				} else {
					if(game.pixiApp) { // another project is currently open.
						location.reload();
						return;
					}
				}

				game.applyProjectDesc(this.projectDesc);

				game.init(window.document.getElementById('viewport-root') || undefined, 'editor.' + this.projectDesc.id, '/games/' + dir + '/');

				game.stage.interactiveChildren = false;
				protectAccessToSceneNode(game.stage, "game stage");
				protectAccessToSceneNode(game.stage.parent, "PIXI stage");

				await Promise.all([this.reloadAssetsAndClasses(true), Texture.fromURL('/thing-editor/img/wrong-texture.png').then((t) => {
					Lib.REMOVED_TEXTURE = t;
				})]);

				editorEvents.emit('didProjectOpen');



				if(game.settings.getItem(LAST_SCENE_NAME) && !Lib.hasScene(game.settings.getItem(LAST_SCENE_NAME))) {
					this.saveLastSceneOpenName('');
				}
				game.settings.setItem(LAST_SCENE_NAME, game.settings.getItem(LAST_SCENE_NAME) || this.projectDesc.mainScene || 'main');

				this.__projectOpenWasFine(dir);

				this.restoreBackup();

				this.regeneratePrefabsTypings();

				fs.watchDirs(this.assetsFolders);

				this.ui.modal.hideSpinner();
				this.isProjectOpen = true;

				game.onResize();


			}
		}
	}

	__projectOpenWasFine(dir: string) {
		this.settings.setItem('last-opened-project', dir);

	}

	warnEqualFiles(file: FileDesc, existingFile: FileDesc) {
		this.ui.status.warn("File overlaps the same file in library. " + file.fileName + ' => ' + existingFile.fileName, 99999, (ev?: PointerEvent) => {
			let preview = AssetsView.rendeAssetItem(file);
			if(ev && ev.ctrlKey) {
				fs.deleteAsset(file.assetName, file.assetType);
			}
			editor.ui.modal.showEditorQuestion('A you sure you want to remove duplicate file?', preview, () => {
				fs.deleteAsset(file.assetName, file.assetType);
			}, R.span({ className: 'danger' }, R.img({ src: 'img/delete.png' }), "Delete duplicate file"));
		});
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


			document.title = '(' + this.projectDesc.title + ') - - (' + game.currentScene.name + ')';
			this.saveLastSceneOpenName(game.currentScene.name as string);
			if(game.currentScene) {
				this.selection.loadCurrentSelection();
			}
			this.history.setCurrentStateUnmodified();
			this.regeneratePrefabsTypings();
			this.ui.refresh();
		}
	}

	classesUpdatedExternally() {
		ClassesLoader.isClassesWaitsReloading = true;
		this.ui.viewport.refresh();
	}

	/** if returns false - cancel operation */
	askSceneToSaveIfNeed(): boolean {
		this.ui.viewport.stopExecution();
		PrefabEditor.acceptPrefabEdition();
		if(this.isCurrentSceneModified) {
			let ansver = fs.showQuestion(
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

	addTo(parent: Container, child: Container) {
		parent.addChild(child);
		Lib.__callInitIfGameRuns(child);
		this.selection.select(child, true);
		Lib.__invalidateSerializationCache(child);
		this.sceneModified();
	}

	isCanBeAddedAsChild(Class: SourceMappedConstructor): boolean {
		if(this.selection.length < 1) {
			return false;
		}
		for(let o of this.selection) {
			if((o.constructor as SourceMappedConstructor).__canAcceptChild) {
				if(!(o.constructor as SourceMappedConstructor).__canAcceptChild(Class)) {
					return false;
				}
			}
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
		/*for(let f of this.checkSceneHandlers) { //TODO
			f();
		}*/

		this.ui.viewport.stopExecution();

		assert(name, "Name can't be empty");
		assert(game.__EDITOR_mode, "tried to save scene in running mode.");
		if(this.isCurrentSceneModified || (this.currentSceneName !== name)) {

			this.history.setCurrentStateUnmodified();
			this.saveLastSceneOpenName(name);
			this._callInPortraitMode(() => {
				Lib.__saveScene(game.currentScene, name);
				this.selection.saveCurrentSelection();
			});
		}
	}

	get currentSceneName(): string {
		return game.settings.getItem(LAST_SCENE_NAME, '');
	}

	get currentSceneBackupName() {
		return EDITOR_BACKUP_PREFIX + game.settings.getItem(LAST_SCENE_NAME);
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

	previewSound(soundName: string) {
		if(Lib.getSound(soundName).playing()) {
			Lib.getSound(soundName).stop();
		} else {
			Sound.play(soundName);
		}
	}

	async chooseImage(title: ComponentChild = "Choose image", activeImage?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.IMAGE, title, activeImage);
	}

	async chooseSound(title: ComponentChild = "Choose sound", activeSound?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.SOUND, title, activeSound, this.previewSound);
	}

	async choosePrefab(title: ComponentChild = "Choose prefab", currentPrefab?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.PREFAB, title, currentPrefab);
	}

	async chooseClass(isScene: boolean, title: ComponentChild = "Choose class", currentClass?: string): Promise<string | null> {
		return this.chooseAsset(AssetType.CLASS, title, currentClass, undefined, (file: FileDesc) => {
			return (file as FileDescClass).asset.__isScene === isScene;
		});
	}


	async chooseAsset(type: AssetType, title: ComponentChild, currentValue?: string, onItemPreview?: (assetName: string) => void, filterCallback?: (f: FileDesc) => boolean): Promise<string | null> {
		const id = type + '_choose_asset_list';
		const chosen: string = await this.ui.modal.showModal(h(AssetsView, {
			onItemSelect: (assetName: string) => {
				this.ui.modal.hideModal(assetName);
			},
			id,
			content: undefined,
			helpId: 'ChooseId',
			x: 0,
			minW: 400,
			minH: 200,
			y: 0,
			w: 50,
			h: 50,
			key: id,
			title,
			currentValue,
			onItemPreview,
			hideMenu: true,
			filter: { [type]: true },
			filterCallback
		}));
		if(chosen) {
			return chosen;
		}
		return null;
	}

	async reloadAssetsAndClasses(refresh = false) {
		if(refresh) {
			fs.refreshAssetsList(this.assetsFolders);
		}
		await this.reloadClasses();
		await AssetsLoader.reloadAssets();
	}

	onObjectsPropertyChanged(o: Container, field: EditablePropertyDesc | string, val: any, isDelta?: boolean) { // TODO два похожих метода. Сделать один для выделения и объекта
		assert((!isDelta) || (typeof isDelta === 'boolean'), "isDelta expected to be bool");
		let changed = false;
		if(typeof field === 'string') {
			field = this.getObjectField(o, field);
		}

		editorEvents.emit('beforePropertyChanged', o, field.name, field, val, isDelta);

		if(isDelta) {
			if(val === 0) {
				return;
			}
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

		editorEvents.emit('afterPropertyChanged', o, field.name, field, val, isDelta);

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
			for(let p of(node.constructor as SourceMappedConstructor).__editableProps) {
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
		if(fileName.startsWith('\\') || fileName.startsWith('/')) {
			rootPath = rootPath.substring(0, rootPath.length - 1);
		}
		let url = '/__open-in-editor?file=' + rootPath + fileName;
		fetch(url);
	}

	editClassSource(c: SourceMappedConstructor | Container, className: string = '') {
		if(c instanceof Container) {
			c = c.constructor as SourceMappedConstructor;
		}
		if(!c || (c as any) === __UnknownClass || (c as any) === __UnknownClassScene) {
			this.ui.modal.showError("Object has unknown type '" + className + "', and has no source code. Probably source code was removed.")
			return;
		}

		this.editSource(c.__sourceFileName as string);
	}

	protected saveLastSceneOpenName(name: string) {
		if(!name.startsWith(EDITOR_BACKUP_PREFIX)) {
			game.settings.setItem('__EDITOR_last_scene_name', name);
		}
	}

	protected __saveProjectDescriptorInner(cleanupOnly = false) {
		let isCleanedUp = false;
		//TODO: cleanup values which match with this.libsProjectDescMerged;

		if(!cleanupOnly || isCleanedUp) {
			fs.writeFile(this.currentProjectDir + 'thing-project.json', this.projectDesc);
		}
	}
}

const WORKSPACE_FILE_NAME = 'electron-vite-preact.code-workspace';
const TS_CONFIG_FILE_NAME = 'tsconfig.json';

function sanitizeJSON(input: string) {
	return input.replace(/\/\/.*$/gm, '').replace(/\/\*.*\*\//gm, '');
}

/** returns true if tsconfig.json changed */
function excludeOtherProjects(): boolean | undefined {
	try { // vscode workspace

		const workspaceConfigSrc = fs.readFile(WORKSPACE_FILE_NAME);
		const foldersDataRegExt = /"folders"\s*:\s*\[[^\]]*\]/gm;
		let foldersData = foldersDataRegExt.exec(workspaceConfigSrc);

		const foldersDataString = sanitizeJSON(foldersData!.pop()!);
		const workspaceConfig = JSON.parse('{' + foldersDataString + '}');
		const folders = (workspaceConfig.folders as { path: string, name: string }[]).filter((folderData) => {
			return !folderData.path.startsWith('./games/') && !folderData.path.startsWith('./libs/');
		});
		folders.push({
			path: './' + editor.currentProjectDir,
			name: editor.currentProjectDir
		});
		for(let lib of editor.currentProjectLibs) {
			folders.push({
				path: './' + lib.dir,
				name: lib.dir
			});
		}

		let newFoldersSrc = JSON.stringify({ folders }, undefined, '\t');
		newFoldersSrc = newFoldersSrc.substring(3, newFoldersSrc.length - 2);
		if(newFoldersSrc !== foldersDataString) {
			fs.writeFile(WORKSPACE_FILE_NAME, workspaceConfigSrc.replace(foldersDataRegExt, newFoldersSrc));
		}
	} catch(er) {
		debugger;
		console.error('JSON parsing error: ' + WORKSPACE_FILE_NAME);
		console.error(er);
	}

	try { // tsconfig

		const workspaceConfigSrc = fs.readFile(TS_CONFIG_FILE_NAME);
		const foldersDataRegExt = /"include"\s*:\s*\[[^\]]*\]/gm;
		let foldersData = foldersDataRegExt.exec(workspaceConfigSrc);

		const foldersDataString = sanitizeJSON(foldersData!.pop()!);
		const tsConfig = JSON.parse('{' + foldersDataString + '}');
		const include = (tsConfig.include as string[]).filter((folder) => {
			return !folder.startsWith('./games/') && !folder.startsWith('./libs/');
		});
		include.push('./' + editor.currentProjectDir);
		for(let lib of editor.currentProjectLibs) {
			include.push('./' + lib.dir);
		}

		let newFoldersSrc = JSON.stringify({ include });
		newFoldersSrc = newFoldersSrc.substring(1, newFoldersSrc.length - 1);
		if(newFoldersSrc !== foldersDataString) {
			fs.writeFile(TS_CONFIG_FILE_NAME, workspaceConfigSrc.replace(foldersDataRegExt, newFoldersSrc));
			return true;
		}
	} catch(er) {
		debugger;
		console.error('JSON parsing error: ' + TS_CONFIG_FILE_NAME);
		console.error(er);
	}
}


const editor = new Editor();

type __EditorType = typeof editor;

export type { __EditorType }; // hide Editor from intellisense
