import utils from './utils/editor-utils.js';
import game from 'thing-engine/js/game.js';
import Settings from 'thing-engine/js/utils/settings.js';
import Selection from './utils/selection.js';
import './utils/socket.js';
import fs from './utils/fs.js';
import history from './utils/history.js';
import UI from './ui/ui.js';
import ClassesLoader from './utils/classes-loader.js';
import AssetsLoader from './utils/assets-loader.js';
import ScenesList from "./ui/scenes-list.js";
import Overlay from "./utils/overlay.js";
import PrefabsList from "./ui/prefabs-list.js";
import Signal from "./utils/signal.js";
import Lib from "thing-engine/js/lib.js";
import build from "./utils/build.js";
import LanguageView from "./ui/language-view.js";
import Timeline from "./ui/props-editor/timeline/timeline.js";
import DisplayObject from 'thing-engine/js/components/display-object.js';
import Scene from 'thing-engine/js/components/scene.js';
import ClassesView from './ui/classes-view.js';
import TexturesView from './ui/textures-view.js';
import PrefabReference from 'thing-engine/js/components/prefab-reference.js';
import Tilemap from 'thing-engine/js/components/tilemap.js';
import defaultTilemapProcessor from './utils/default-tilemap-processor.js';
import DataPathFixer from './utils/data-path-fixer.js';
import Container from 'thing-engine/js/components/container.js';

let isFirstClassesLoading = true;

let refreshTreeViewAndPropertyEditorScheduled;

let serverAllowedWork;
let uiMounted;

export default class Editor {
	
	get editorFilesPrefix() {
		return '.editor-tmp/';
	}
	
	get backupSceneLibSaveSlotName() {
		return this.editorFilesPrefix + 'backup';
	}
	
	constructor() {
		/*global editor */
		window.editor = this;
		this.Lib = Lib;
		window.wrapPropertyWithNumberChecker(PIXI.ObservablePoint, 'x');
		window.wrapPropertyWithNumberChecker(PIXI.ObservablePoint, 'y');

		this.scheduleHistorySave = history.scheduleHistorySave;
		this.saveHistoryNow = history.saveHistoryNow;
		
		this.fs = fs;
		
		this.DataPathFixer = DataPathFixer;

		this.settings = new Settings('editor');
		this.selection = new Selection();
		
		this.ClassesLoader = ClassesLoader;
		this.AssetsLoader = AssetsLoader;

		this.callInitIfGameRuns = callInitIfGameRuns;

		this.onUIMounted = this.onUIMounted.bind(this);
		this.onSelectedPropsChange = this.onSelectedPropsChange.bind(this);
		this.reloadClasses = this.reloadClasses.bind(this);
		
		this.history = history;
		
		this.beforePropertyChanged = new Signal();
		this.afterPropertyChanged = new Signal();
		Timeline.init();
		ReactDOM.render(
			React.createElement(UI, {onMounted: this.onUIMounted}),
			document.getElementById('root')
		);

		setInterval(() => { //keep props editor and tree actual during scene is launched
			if(!game.__EDITOR_mode && !game.__paused) {
				editor.refreshTreeViewAndPropertyEditor();
			}
		}, 300);

		editor.__unloadedTexture = PIXI.Texture.fromImage('img/loading-texture.png');
	}

	deselectMovieClip(o) {
		Timeline.deselectMovieClip(o);
	}
	
	/**
	 *
	 * @param ui {UI}
	 */
	onUIMounted(ui) {
		/** @member {UI} */
		this.ui = ui;
		uiMounted = true;
		this.tryToStart();
	}

	onServerAllowsWorking() {
		serverAllowedWork = true;
		this.tryToStart();
	}

	tryToStart() {
		if(uiMounted && serverAllowedWork) {
			game.__EDITOR_mode = true;
			editor.game = game;
			ClassesLoader.initClassesLoader();
			AssetsLoader.init();
			this.openProject();
		}
	}
	
	openProjectDescToEdit() {
		editor.fs.editFile(game.resourcesPath + 'thing-project.json');
	}
	
	async openProject(dir) {
		editor.ui.viewport.stopExecution();
		await editor.askSceneToSaveIfNeed();
		
		let lastOpenedProject = location.search ? location.search.replace('?','') : editor.settings.getItem('last-opened-project');
		if(!dir) {
			dir = lastOpenedProject;
		}
		if(!dir) {
			this.fs.chooseProject(true);
		} else if((dir + '/') !== editor.currentProjectDir) {
			editor.projectOpeningInProgress = true;
			editor.settings.setItem('last-opened-project', dir);
			if(dir !== lastOpenedProject) {
				editor.projectOpeningInProgress = false;
				editor.__projectReloading = true;
				location.reload();
				return;
			}
			editor.settings.setItem('last-opened-project', false);
			let data = await this.fs.getJSON('/fs/openProject?dir=' + dir);
			if(!data) {
				editor.projectOpeningInProgress = false;
				editor.ui.modal.showError("Can't open project " + dir).then(() => {this.openProject();});
				return;
			}
			await this.fs.refreshFiles();
			editor.currentProjectDir = dir + '/';
			editor.projectDesc = data;

			let isProjectDescriptorModified = game.applyProjectDesc(editor.projectDesc);

			await game.init(document.getElementById('viewport-root'), 'editor.' + editor.projectDesc.id, '/games/' + dir + '/');
			Lib.__onProjectOpen();
			Tilemap.tileMapProcessor = defaultTilemapProcessor;
			game.stage.interactiveChildren = false;
			
			this.overlay = new Overlay();
			await Promise.all([editor.reloadAssetsAndClasses(), ScenesList.readAllScenesList(), PrefabsList.readAllPrefabsList(), LanguageView.loadTextData()]);
			
			editor.settings.setItem('last-opened-project', dir);
			
			if(isProjectDescriptorModified) {
				this.saveProjectDesc();
			} else {
				__saveProjectDescriptorInner(true); // try to cleanup descriptor
			}

			utils.protectAccessToSceneNode(game.stage, "game stage");
			utils.protectAccessToSceneNode(game.stage.parent, "PIXI stage");
			

			if(editor.projectDesc.__lastSceneName && !Lib.hasScene(editor.projectDesc.__lastSceneName)) {
				editor.projectDesc.__lastSceneName = false;
			}
			
			if(Lib.hasScene(editor.backupSceneLibSaveSlotName)) {
				//backup restoring
				editor.ui.modal.showEditorQuestion("Scene's backup restoring (" + editor.projectDesc.title + ")",
					R.fragment(R.div(null, "Looks like previous session was finished incorrectly."),
						R.div(null, "Do you want to restore scene from backup?")),
					async() => {
						await this.openSceneSafe(editor.backupSceneLibSaveSlotName, editor.projectDesc.__lastSceneName || 'restored-from-backup');
						editor.history.currentState.treeData._isModified = true;
						
					}, 'Restore backup',
					async() => {
						await this.openSceneSafe(editor.projectDesc.__lastSceneName || 'main');
						Lib.__deleteScene(editor.backupSceneLibSaveSlotName);
					}, 'Delete backup',
					true
				);
			} else {//open last project's scene
				await this.openSceneSafe(editor.projectDesc.__lastSceneName || 'main');
			}
			editor.projectOpeningInProgress = false;
		}
	}

	copyToClipboard(text) {
		navigator.permissions.query({
			name: 'clipboard-read'
		}).then(() => {
			navigator.clipboard.writeText(text).then(()=>{
				editor.ui.modal.notify(R.span(null, R.icon('copy'), '"' + text + '"'));
			});
		});
	}
	
	set clipboardData(cd) {
		editor.settings.setItem('__EDITOR-clipboard-data', cd);
	}
	
	get clipboardData() {
		return editor.settings.getItem('__EDITOR-clipboard-data');
	}
	
	openSceneSafe(name) {
		return editor.askSceneToSaveIfNeed(ScenesList.isSpecialSceneName(name)).then(() => {
			this.loadScene(name);
			document.title = '(' + editor.projectDesc.title + ') - - (' + name + ')';
			saveCurrentSceneName(game.currentScene.name);
			if(game.currentScene) {
				this.selection.loadSelection(game.settings.getItem('__EDITOR_scene_selection' + editor.currentSceneName));
			}
			history.clearHistory();
			history.setCurrentStateUnmodified();
			this.ui.forceUpdate();
		});
	}
	
	openUrl(url) {
		if(!window.open(url)) {
			editor.ui.modal.showModal(R.div(null,
				"click to open: ",
				R.a({href: url, target: '_blank'}, url),
				R.br(),
				"Check browser's status bar to allow automatic opening after build."
			), "building finished.");
		}
	}

	cloneSelected(dragObject) {
		let ret;
		DataPathFixer.rememberPathReferences();

		editor.disableFieldsCache = true;
		let allCloned = [];

		editor.selection.some((o) => {

			

			let clone = Lib._deserializeObject(Lib.__serializeObject(o));
			allCloned.push(clone);
			if(dragObject) {
				if(o === dragObject) {
					ret = clone;
				}
			}
			Lib.__reassignIds(clone);
			
			let cloneExData = __getNodeExtendData(clone);
			let exData = __getNodeExtendData(o);
			if(exData.hidePropsEditor) {
				cloneExData.hidePropsEditor = exData.hidePropsEditor;
			}
			if(exData.rotatorLocked) {
				cloneExData.rotatorLocked = exData.rotatorLocked;
			}
			
			increaseNameNumber(clone);
			clone.forAllChildren(increaseNameNumber);

			o.parent.addChildAt(clone, o.parent.children.indexOf(o) + 1);

			if(!game.__EDITOR_mode) {
				Lib._constructRecursive(clone);
			}
			Lib.__invalidateSerializationCache(clone);

		});

		editor.selection.clearSelection();
		for(let c of allCloned) {
			editor.selection.add(c);
		}

		editor.disableFieldsCache = false;

		if(!dragObject) {
			editor.onSelectedPropsChange('y', 10, true);
		}
		
		DataPathFixer.validatePathReferences();
		editor.refreshTreeViewAndPropertyEditor();
		editor.sceneModified();
		return ret;
	}

	wrapSelected(className) {
		if(!game.__EDITOR_mode) {
			editor.ui.modal.showModal("Can not wrap in running mode.");
			return;
		}

		let isClipboardWrapping = ((typeof className) !== 'string');

		if(editor.selection.length < 1) {
			editor.ui.modal.showModal('Nothing selected to be wrapped.', 'Alert');
		} else if(isClipboardWrapping && (!editor.clipboardData || editor.clipboardData.length !== 1)) {
			editor.ui.modal.showModal('Exactly one container should be copied in to clipBoard to wrap selection with it.', 'Alert');
		} else {
			let a = editor.selection.slice(0);

			let o = a[0];
			let parent = o.parent;
			for(let c of a) {
				if(c.parent !== parent) {
					editor.ui.modal.showModal('Selected object should have same parent to be wrapped.', 'Alert');
					return;
				}
			}


			if(o instanceof Scene) {
				editor.ui.modal.showModal("Scene can not be wrapped, you can change scene's type instead.", 'Alert');
				return;
			}
			DataPathFixer.rememberPathReferences();
			let isPrefab = o === game.currentContainer;
			let prefabName = game.currentContainer.name;
			
			
			editor.selection.clearSelection();
			let w;
			if(!isClipboardWrapping) {
				w = ClassesView.loadSafeInstanceByClassName(className, true);
			} else {
				editor.disableFieldsCache = true;
				w = Lib._deserializeObject(editor.clipboardData[0]);
				editor.disableFieldsCache = false;
			}
			w.x = 0;
			w.y = 0;
			let indexToAdd = parent.getChildIndex(o);

			for(let c of a) {
				w.addChild(c);
			}
			if(isPrefab) {
				w.name = prefabName;
				o.name = null;
				var data = Lib.__serializeObject(w);
				w = Lib._deserializeObject(data);
				game.__setCurrentContainerContent(w);
			} else {
				parent.addChildAt(w, indexToAdd);
			}
			Lib.__invalidateSerializationCache(w);

			editor.selection.clearSelection();
			editor.ui.sceneTree.selectInTree(w);
			__getNodeExtendData(w).childrenExpanded = true;
			DataPathFixer.validatePathReferences();
			editor.sceneModified(true);
			callInitIfGameRuns(w);
		}
	}

	isCanBeAddedAsChild() {
		if(editor.selection.length !== 1) {
			return;
		}
		let o = editor.selection[0];
		if(!(o instanceof Container)) {
			return;
		}
		return editor.isCanBeAdded();
	}

	isCanBeAdded() {
		let o = editor.selection[0];
		return o && !o.constructor.__canNotHaveChildren; // 99999
	}

	onEditorRenderResize() {
		editor.refreshTreeViewAndPropertyEditor();
		if(editor.overlay) {
			editor.overlay.onEditorRenderResize();
		}
	}
	
	saveBackup(includeUnmodified = false) {
		editor.__backupUID = (editor.__backupUID || 0) + 1;
		if(!game.__EDITOR_mode) {
			assert(!includeUnmodified, 'Attempt to save important backup in running mode');
			return;
		}

		if(!game.currentScene) {
			assert(!includeUnmodified, 'Attempt to save important backup when project was not loaded yet.');
			return;
		}

		this.saveCurrentScenesSelectionGlobally();

		savedBackupName = editor.backupSceneLibSaveSlotName;
		if (!editor.isCurrentSceneModified) {
			if(!includeUnmodified) {
				savedBackupName = null;
				return;
			}
			savedBackupName += '-unmodified';
		}
		editor.saveCurrentScene(savedBackupName);
		savedBackupSelectionData = editor.selection.saveSelection();
	}
	
	restoreBackup(includeUnmodified = false) {
		if(!game.__EDITOR_mode) {
			assert(!includeUnmodified, 'Attempt to restore important backup in running mode');
			return;
		}
		
		if(!savedBackupName) {
			assert(!includeUnmodified, 'No backup scene was saved before restoring important backup.');
			return;
		}
		editor.loadScene(savedBackupName);
		savedBackupName = null;
		editor.selection.loadSelection(savedBackupSelectionData);
	}
	
	cleanupBackup() {
		if(Lib.hasScene(editor.backupSceneLibSaveSlotName)) {
			Lib.__deleteScene(editor.backupSceneLibSaveSlotName);
		}
	}
	
	get currentSceneName() {
		return editor.projectDesc ? editor.projectDesc.__lastSceneName : null;
	}
	
	refreshPropsEditor() {
		this.ui.propsEditor.forceUpdate();
	}
	
	refreshTreeViewAndPropertyEditor() {
		if(refreshTreeViewAndPropertyEditorScheduled) return;
		refreshTreeViewAndPropertyEditorScheduled = true;
		setTimeout(()=> {
			refreshTreeViewAndPropertyEditorScheduled = false;
			this.ui.sceneTree.forceUpdate();
			this.refreshPropsEditor();
		}, 1);
	}
	
	reloadClasses() {
		let ftl = isFirstClassesLoading;
		isFirstClassesLoading = false;
		this.ui.viewport.stopExecution();
		assert(game.__EDITOR_mode, 'tried to reload classes in running mode.');
		editor.saveBackup(!ftl);
		
		return new Promise((resolve) => {
			editor.fs.refreshFiles().then(()=>{
				ClassesLoader.reloadClasses().then(() => {
					ClassesLoader.validateClasses();
					editor.restoreBackup(!ftl);
					resolve();
					this.ui.viewport.jsFilesReloaded();
				});
			});
		});
	}
	
	reloadAssets() {
		return new Promise((resolve) => {
			editor.ui.soundsList.reloadSounds().then(() => {
				AssetsLoader.reloadAssets().then(resolve);
			});
		});
	}
	
	reloadAssetsAndClasses() {
		return new Promise((resolve) => {
			this.reloadAssets().then(() => {
				this.reloadClasses().then(() => {
					if(game.currentContainer) {
						game.__loadDynamicTextures();
					}
					resolve();
				});
			});
		});
	}
	
	attachToSelected(o, doNotSelect) {
		if(this.selection.length > 0) {
			addTo(this.selection[0], o, doNotSelect);
		} else {
			this.addToScene(o, doNotSelect);
		}
	}
	
	addToScene(o, doNotSelect) {
		addTo(game.currentContainer, o, doNotSelect);
	}
	
	/**
	 * set property value received from property editor
	 */
	onSelectedPropsChange(field, val, delta) {
		if(this.selection.length > 0) {
			
			if(typeof field === 'string') {
				field = editor.getObjectField(this.selection[0], field);
			}
			if(field.beforeEdited) { /// 99999
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

	onObjectsPropertyChanged(o, field, val, delta) {
		assert((!delta) || (typeof delta === 'boolean'), "Delta expected to be bool");
		let changed = false;
		if(typeof field === 'string') {
			field = editor.getObjectField(o, field);
		}
		
		this.beforePropertyChanged.emit(o, field.name, field);
		
		if(delta) {
			assert(field.type === Number, "editable field descriptor type: Number expected");

			let v = o[field.name];
			let newVal = v + val;
			if(field.hasOwnProperty('min')) {
				newVal = Math.max(field.min, newVal);
			}
			if(field.hasOwnProperty('max')) {
				newVal = Math.min(field.max, newVal);
			}
			if(v !== newVal) {
				o[field.name] = newVal;
				changed = true;
			}
		} else {
			if(o[field.name] !== val) {
				o[field.name] = val;
				changed = true;
			}
		}
		
		this.afterPropertyChanged.emit(o, field.name, field);
		
		if(changed) {
			Lib.__invalidateSerializationCache(o);
			this.refreshTreeViewAndPropertyEditor();
			editor._lastChangedFiledName = field.name;
			editor.sceneModified(false);
		}
		return changed;
	}
	
	/**
	 * enumerate all editable properties of given DisplayObject.
	 */
	enumObjectsProperties(o) {
		return o.constructor.__EDITOR_propsListCache;
	}

	showStack(stack) {
		let a = stack.stack.split('\n');
		a.shift();
		a.shift();
		a = a.map((s) => {
			let functionName;
			if(s.indexOf(' (') > 0) {
				functionName = s.split(' (');
				s = functionName[1];
				functionName = functionName[0];
			} else {
				functionName = '';
			}

			s = s.split('/');
			s.shift();
			s.shift();
			s.shift();
			s = s.join('/');
			if(s.indexOf('?') > 0) {
				s = s.split('?');
				let a = s[1].split(':');
				s = s[0] + ':' + a[1];
			}
			return {functionName, path: s};
		});
		editor.ui.modal.showModal(R.div(null, R.b(null, stack.title), ' was created at:', a.map((i,key) => {
			return R.div({key, className: 'list-item stack-item', onClick: () => {
				let a = i.path.split(':');
				editor.fs.editFile('/' + a[0], parseInt(a[1]));
			}}, R.b(null, i.functionName), ' (', i.path, ')');
		})));
	}

	__getCurrentStack(title) {
		return {title, stack: (new Error()).stack};
	}
	
	getObjectField(o, name) {
		return editor.enumObjectsProperties(o).find((f) => {
			return f.name === name;
		});
	}

	saveCurrentScenesSelectionGlobally() {
		if(game.currentScene) {
			game.settings.setItem('__EDITOR_scene_selection' + editor.currentSceneName, this.selection.saveSelection());
		}
	}
	
	loadScene(name) {
		assert(name, 'name should be defined');
		this.saveCurrentScenesSelectionGlobally();
		
		game.showScene(name);
		
		__getNodeExtendData(game.currentContainer).childrenExpanded = true;

		if(name.startsWith(editor.backupSceneLibSaveSlotName)) {
			let backupUID = editor.__backupUID;
			setTimeout(() => { //prevent backup deletion if page reloaded
				if((backupUID === editor.__backupUID) && Lib.hasScene(name)) {
					Lib.__deleteScene(name);
				}
			}, 50);
		}
		this.refreshTreeViewAndPropertyEditor();
	}
	
	saveProjectDesc() {
		window.debouncedCall(__saveProjectDescriptorInner);
	}

	refreshTexturesViewer() {
		TexturesView.refresh();
	}
	
	sceneModified(saveImmediately) {
		editor.history._sceneModifiedInner(saveImmediately);
	}
	
	centralizeObjectToContent (o) {
		if(!o.children.length) {
			return;
		}
		let b = o.getBounds();
		let p;
		if(b.width > 0 || b.height > 0) {
			let b = o.getBounds();
			let midX = b.x + b.width / 2;
			let midY = b.y + b.height / 2;
			p = new PIXI.Point(midX, midY);
			o.parent.toLocal(p, undefined, p);
		} else {
			let midX = 0;
			for(let c of o.children) {
				midX += c.x;
			}
			midX /= o.children.length;
		
			let midY = 0;
			for(let c of o.children) {
				midY += c.y;
			}
			midY /= o.children.length;
			p = new PIXI.Point(midX, midY);
			o.parent.toLocal(p, o, p);
		}

		let pos = o.getGlobalPosition();
		let p2 = new PIXI.Point();
		o.parent.toLocal(pos, undefined, p2);
		
		this.moveContainerWithoutChildren(o, Math.round(p.x - p2.x), Math.round(p.y - p2.y));
	}

	waitForCondition(condition) {
		if(condition()) {
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			let i = setInterval(() => {
				if(condition()
				/// #if EDITOR
				|| game.__EDITOR_mode
				/// #endif
				) {
					resolve();
					clearInterval(i);
				}
			}, 100);
		});
	}
	
	moveContainerWithoutChildren(o, dX, dY) {

		for(let c of o.children) {
			__getNodeExtendData(c).globalPos = c.getGlobalPosition();
		}

		editor.shiftObject(o, dX, dY);
		for(let c of o.children) {
			let p = o.toLocal(__getNodeExtendData(c).globalPos);
			editor.shiftObject(c, Math.round(p.x - c.x), Math.round(p.y - c.y));
		}
	}
	
	shiftObject(o, dx, dy) {
		if(dx !== 0 || dy !== 0) {
			// Shift wrapped object to zero. If it is MovieClip its will shift all timeline.
			
			if(o.__shiftObject) {
				o.__shiftObject(dx, dy);
			} else {

				Timeline.disableRecording();
				if (dx !== 0) {
					editor.onObjectsPropertyChanged(o, 'x', dx, true);
				}
				if (dy !== 0) {
					editor.onObjectsPropertyChanged(o, 'y', dy, true);
				}
				Timeline.enableRecording();
			}
		}
	}
	
	exitPrefabMode() {
		if(editor.ui.prefabsList) {
			PrefabsList.acceptPrefabEdition();
		}
	}
	get isCurrentContainerModified() {
		return history.isStateModified;
	}

	get isCurrentSceneModified() {
		if(game.currentScene !== game.currentContainer) {
			alert("access to isCurrentSceneModified in prefab mode");
		}
		return this.isCurrentContainerModified;
	}
	
	editClassSource(c) {
		if(c instanceof DisplayObject) {
			if((c instanceof PrefabReference) && c.__previewNode) {
				c = c.__previewNode.constructor;
			} else {
				c = c.constructor;
			}
		}
		let filePath = editor.ClassesLoader.getClassPath(c.name);
		editor.fs.editFile(filePath);
	}
	
	saveCurrentScene(name) {
		editor.ui.viewport.stopExecution();
		if(!name) {
			name = editor.currentSceneName;
		}
		assert(name, "Name can't be empty");
		assert(game.__EDITOR_mode, "tried to save scene in running mode.");
		if(editor.isCurrentSceneModified || (editor.currentSceneName !== name)) {
			if(!ScenesList.isSpecialSceneName(name)) {
				history.setCurrentStateUnmodified();
				saveCurrentSceneName(name);
			}
			let ret;
			this._callInPortraitMode(() => {
				ret =  Lib.__saveScene(game.currentScene, name);
			});
			return ret;

		}
		return Promise.resolve();
	}

	pauseGame() {
		if(!game.__paused && !game.__EDITOR_mode) {
			game.__paused = true;
			editor.ui.viewport.forceUpdate();
		}
	}

	_callInPortraitMode(callback) {
		let tmpOrientation = game.___enforcedOrientation;
		if (game.projectDesc.screenOrientation === 'auto') {
			game.___enforcedOrientation = 'landscape';
			game.__enforcedW = game.projectDesc.width;
			game.__enforcedH = game.projectDesc.height;
		} if (game.projectDesc.screenOrientation === 'portrait') {
			game.__enforcedW = game.projectDesc.portraitWidth;
			game.__enforcedH = game.projectDesc.portraitHeight;
		} else {
			game.__enforcedW = game.projectDesc.width;
			game.__enforcedH = game.projectDesc.height;
		}
		game.onResize();
		callback();
		game.___enforcedOrientation = tmpOrientation;
		delete game.__enforcedW;
		delete game.__enforcedH;
		game.onResize();

	}
	
	build(debug) {
		editor.askSceneToSaveIfNeed().then(() => {
			build.build(debug);
		});
	}

	askSceneToSaveIfNeed(skip) {
		editor.ui.viewport.stopExecution();
		if(!skip && editor.isCurrentSceneModified) {
			return new Promise((resolve) => {
				
				editor.ui.modal.showEditorQuestion('Scene was modified.', 'Do you want to save the changes in current scene?',
					() => {
						editor.saveCurrentScene().then(resolve);
					}, 'Save',
					() => {
						resolve();
						
					}, "Don't save"
				);
			});
		} else {
			return Promise.resolve();
		}
	}

	getFieldNameByValue(node, fieldValue) {
		for(let p of this.enumObjectsProperties(node)) {
			if(node[p.name] === fieldValue) {
				return p.name;
			}
		}
	}

	validateCallbackParameter(txt) {
		if(txt.indexOf(',') >= 0) {
			return "Parameter can not contain commas. Use your own javascript function instead.";
		}
		if(txt.indexOf('`') >= 0) {
			return "Parameter can not contain apostrophes. Use your own javascript function instead.";
		}
	}

	rememberTryTime() {
		tryTime = Date.now();
	}

	checkTryTime() {
		if(!tryCatchWarned && ((Date.now() - tryTime) > 1000)) {
			tryCatchWarned = true;
			editor.ui.status.warn("Looks like you stopped on caught exception, probably you need to disable 'stop on caught exception' option in your debugger.", 99999);
		}
	}
}

let tryCatchWarned;
let tryTime;

function saveCurrentSceneName(name) {
	if(editor.projectDesc.__lastSceneName !== name) {
		editor.projectDesc.__lastSceneName = name;
		editor.saveProjectDesc();
		editor.ui.forceUpdate();
	}
}

function addTo(parent, child, doNotSelect) {
	parent.addChild(child);
	Lib.__reassignIds(child);
	Lib.__invalidateSerializationCache(child);
	if(!doNotSelect) {
		editor.ui.sceneTree.selectInTree(child);
		editor.sceneModified(true);
	}
	callInitIfGameRuns(child);
}

function __callInitIfNotCalled(node) {
	assert(!game.__EDITOR_mode, "Attempt to init object in editor mode.");
	let d = __getNodeExtendData(node);
	if(!d.constructorCalled) {
		node.init();
		d.constructorCalled = true;
	}
}

function callInitIfGameRuns(node) {
	if(!game.__EDITOR_mode) {
		__callInitIfNotCalled(node);
		node.forAllChildren(__callInitIfNotCalled);
	}
}

let __saveProjectDescriptorInner = (cleanOnly = false) => {
	let isCleanedUp = false;

	//cleanup settings for deleted sounds
	let loadOnDemandSounds = editor.projectDesc.loadOnDemandSounds;
	let a = Object.keys(loadOnDemandSounds);
	for(let k of a) {
		if(!Lib.hasSound(k)) {
			delete loadOnDemandSounds[k];
			isCleanedUp = true;
		}
	}

	//cleanup settings for deleted sounds
	let loadOnDemandTextures = editor.projectDesc.loadOnDemandTextures;
	a = Object.keys(loadOnDemandTextures);
	for(let k of a) {
		if(!Lib.__hasTextureEvenUnloaded(k)) {
			delete loadOnDemandTextures[k];
			isCleanedUp = true;
		}
	}
	if(!cleanOnly || isCleanedUp) {
		editor.fs.saveFile('thing-project.json', editor.projectDesc);
	}
};

let savedBackupName;
let savedBackupSelectionData;

let editorNodeData = new WeakMap();
window.__getNodeExtendData = (node) => {
	assert(node instanceof DisplayObject, "__getNodeExtendData expected DisplayObject", 40901);
	if(!editorNodeData.has(node)) {
		editorNodeData.set(node, {});
	}
	return editorNodeData.get(node);
};
window.__resetNodeExtendData = (node) => {
	if(editorNodeData.has(node)) {
		if(editorNodeData.get(node).isSelected) {
			editor.selection.remove(node);
		}
	}
	editorNodeData.delete(node);
};

function increaseNameNumber(o) {
	if(o.name) { // auto-increase latest number in name
		let a = (/\d+$/mg).exec(o.name);
		if(a) {
			o.name = o.name.replace(/\d+$/mg, (parseInt(a[0]) + 1));
		}
	}
}