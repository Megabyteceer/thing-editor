import utils from './utils/editor-utils.js';
import game from 'thing-editor/js/engine/game.js';
import Settings from 'thing-editor/js/engine/utils/settings.js';
import Selection from './utils/selection.js';
import ws from './utils/socket.js';
import fs from './utils/fs.js';
import history from './utils/history.js';
import UI from './ui/ui.js';
import ClassesLoader from './utils/classes-loader.js';
import AssetsLoader from './utils/assets-loader.js';
import ScenesList from "./ui/scenes-list.js";
import Overlay from "./utils/overlay.js";
import PrefabsList from "./ui/prefabs-list.js";
import Signal from "./utils/signal.js";
import Lib from "thing-editor/js/engine/lib.js";
import build from "./utils/build.js";
import LanguageView from "./ui/language-view.js";
import Timeline from "./ui/props-editor/timeline/timeline.js";
import DisplayObject from 'thing-editor/js/engine/components/display-object.js';
import Scene from 'thing-editor/js/engine/components/scene.js';
import ClassesView from './ui/classes-view.js';
import TexturesView from './ui/textures-view.js';
import PrefabReference from 'thing-editor/js/engine/components/prefab-reference.js';
import Tilemap from 'thing-editor/js/engine/components/tilemap.js';
import defaultTilemapProcessor from './utils/default-tilemap-processor.js';
import DataPathFixer from './utils/data-path-fixer.js';
import Container from 'thing-editor/js/engine/components/container.js';
import {_onTestsStart} from '../engine/utils/autotest-utils.js';
import OrientationTrigger from '../engine/components/orientation-trigger.js';
import callByPath from '../engine/utils/call-by-path.js';
import Pool from "../engine/utils/pool.js";
import ProjectsList from "./ui/projects-list.js";

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
		window.editor = this;
		editor.editorArguments = {};
		if(window.location.hash) {
			for(let arg of window.location.hash.substr(1).split(',')) {
				editor.editorArguments[arg] = true;
			}
		}
		
		// Block page leave by back navigation
		const cloneStateInHistory = () => window.history.pushState(window.history.state, document.title);
		cloneStateInHistory();
		window.onpopstate = cloneStateInHistory;
		
		this.checkSceneHandlers = [];
		this.Lib = Lib;
		window.wrapPropertyWithNumberChecker(PIXI.ObservablePoint, 'x');
		window.wrapPropertyWithNumberChecker(PIXI.ObservablePoint, 'y');

		this.scheduleHistorySave = history.scheduleHistorySave;
		this.saveHistoryNow = history.saveHistoryNow;
		
		this.fs = fs;
		
		this.DataPathFixer = DataPathFixer;
		this.projectDesc = null;

		this.settings = new Settings('editor');
		this.selection = new Selection();
		
		this.ClassesLoader = ClassesLoader;
		this.AssetsLoader = AssetsLoader;
		this.TexturesView = TexturesView;

		this.callInitIfGameRuns = callInitIfGameRuns;

		this.onUIMounted = this.onUIMounted.bind(this);
		this.onSelectedPropsChange = this.onSelectedPropsChange.bind(this);
		this.reloadClasses = this.reloadClasses.bind(this);
		
		this.history = history;
		
		this.beforePropertyChanged = new Signal();
		this.afterPropertyChanged = new Signal();
		Timeline.init();
		editor.Timeline = Timeline;
		ReactDOM.render(
			React.createElement(UI, {onMounted: this.onUIMounted}),
			document.getElementById('root')
		);

		setInterval(() => { //keep props editor and tree actual during scene is launched
			if(!game.__EDITOR_mode && !game.__paused) {
				editor.refreshTreeViewAndPropertyEditor();
			}
		}, 300);

		
		editor.__unloadedTexture = PIXI.Texture.from('img/loading-texture.png');
		editor.__wrongTexture = PIXI.Texture.from('img/wrong-texture.png');
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
			editor.callByPath = callByPath;
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
		
		if(location.search && location.search.indexOf('?buildProjectAndExit=') === 0) {
			editor.buildProjectAndExit = JSON.parse(decodeURIComponent(location.search.replace('?buildProjectAndExit=', '')));
			if(editor.buildProjectAndExit) {
				window.addEventListener('error', function (errEv) {
					ws.exitWithResult(undefined, "UNCAUGHT ERROR: " + JSON.stringify(errEv, ["message", "filename", "lineno", "colno", "stack"]));
				});
				let errorOrigin = console.error;
				console.error = (txt) => {
					errorOrigin(txt);
					ws.exitWithResult(undefined, "CONSOLE ERROR CAPTURED: " + txt);
				};
			}
		}
		let lastOpenedProject = editor.buildProjectAndExit ? editor.buildProjectAndExit.projectName : editor.settings.getItem('last-opened-project');
		if(!dir) {
			dir = lastOpenedProject;
		}
		if(!dir) {
			ProjectsList.chooseProject(true);
		} else if((dir + '/') !== editor.currentProjectDir) {
			this.ui.modal.showSpinner();
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


			let folderSettings;
			let imagesSettings;

			if(this.fs.libsSettings) {
				folderSettings = this.fs.libsSettings.__loadOnDemandTexturesFolders;
				imagesSettings = this.fs.libsSettings.loadOnDemandTextures;
			}

			editor.projectDesc = this.fs.libsSettings ? Object.assign(this.fs.libsSettings, data) : data;
			
			if(folderSettings) {
				this.fs.libsSettings.__loadOnDemandTexturesFolders = Object.assign(folderSettings, editor.projectDesc.__loadOnDemandTexturesFolders);
			}
			if(imagesSettings) {
				this.fs.libsSettings.loadOnDemandTextures = Object.assign(imagesSettings, editor.projectDesc.loadOnDemandTextures);
			}

			editor.settings.setItem(dir + '_EDITOR_lastOpenTime', Date.now());

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
			
			if(!editor.buildProjectAndExit && Lib.hasScene(editor.backupSceneLibSaveSlotName)) {
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
				await this.openSceneSafe(!editor.buildProjectAndExit && editor.projectDesc.__lastSceneName || editor.projectDesc.mainScene || 'main');
				if(editor.buildProjectAndExit) {
					editor.testProject().then(() => {
						editor.build().then(() => {
							editor.build(true).then(() => {
								ws.exitWithResult('build complete');
							});
						});
					});
				}
			}
			this.regeneratePrefabsTypings();
			this.ui.modal.hideSpinner();

			editor.projectOpeningInProgress = false;
		}
	}

	async testProject() {
		if(editor.__preBuildAutoTest && (!editor.editorArguments['skip-tests'])) {
			let sceneName = editor.currentSceneName;
			await editor.openSceneSafe(editor.projectDesc.mainScene || 'main');
			if(game.__EDITOR_mode) {
				editor.ui.viewport.onTogglePlay();
				game.__EDITOR_isAutotestInProgress = true; // 99999_
			}
			await editor.waitForCondition(() => {
				return game.currentContainer;
			});
			await timeout(1000);
			ws.log('Auto-test start...');
			_onTestsStart();
			await editor.__preBuildAutoTest();
			ws.log('Auto-test finished successfully');
			return editor.openSceneSafe(sceneName);
		}
	}

	async exportAsPng(object, width = 0, height = 0, cropAlphaThreshold = 1) {

		if(object.width > 0 && object.height > 0) {
			let tmpVisible = object.visible;
			object.visible = true;
			let oldParent = object.parent;
			let oldIndex;
			if(oldParent) {
				oldIndex = oldParent.children.indexOf(object);
			}
			let f = object.filters;
			let c = new PIXI.Container();
			let c2 = new PIXI.Container();
			c.addChild(object);
			c2.addChild(c);

			object.filters = [];
			editor.ui.modal.showSpinner();

			let b = c.getLocalBounds();

			let canvas = game.pixiApp.renderer.plugins.extract.canvas(c);
			let ctx = canvas.getContext('2d', {
				alpha: true
			});
			let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

			let cropTop = 0;
			while(cropTop < canvas.height) {
				let isEmptyLine = true;
				let y = cropTop * canvas.width * 4 + 3;
				for(let x = 0; x < canvas.width; x++) {
					if(imageData[x * 4 + y] >= cropAlphaThreshold) {
						isEmptyLine = false;
						break;
					}
				}
				if(!isEmptyLine) {
					break;
				}
				cropTop++;
			}

			let cropBottom = 0;
			while(cropBottom < canvas.height) {
				let isEmptyLine = true;
				let y = (canvas.height - 1 - cropBottom) * canvas.width * 4 + 3 ;
				for(let x = 0; x < canvas.width; x++) {
					if(imageData[x * 4 + y] >= cropAlphaThreshold) {
						isEmptyLine = false;
						break;
					}
				}
				if(!isEmptyLine) {
					break;
				}
				cropBottom++;
			}

			let cropLeft = 0;
			while(cropLeft < canvas.width) {
				let isEmptyLine = true;
				let x = cropLeft * 4 + 3;
				for(let y = 0; y < canvas.height; y++) {
					if(imageData[x + y * canvas.width * 4] >= cropAlphaThreshold) {
						isEmptyLine = false;
						break;
					}
				}
				if(!isEmptyLine) {
					break;
				}
				cropLeft++;
			}

			let cropRight = 0;
			while(cropRight < canvas.width) {
				let isEmptyLine = true;
				let x = (canvas.width - 1 - cropRight) * 4 + 3;
				for(let y = 0; y < canvas.height; y++) {
					if(imageData[x + y * canvas.width * 4] >= cropAlphaThreshold) {
						isEmptyLine = false;
						break;
					}
				}
				if(!isEmptyLine) {
					break;
				}
				cropRight++;
			}

			b.y += cropTop;
			b.height -= cropTop + cropBottom;
			b.x += cropLeft;
			b.width -= cropLeft + cropRight;

			let b2 = c2.getLocalBounds();
			c2.getLocalBounds = () => {
				return b2;
			};

			if(width > 0 && height > 0) {
				
				b2.x = 0;
				b2.y = 0;
				b2.width = width;
				b2.height = height;

				let scale = Math.min(width / b.width, height / b.height);
				b.y *= scale;
				b.x *= scale;
				b.width *= scale;
				b.height *= scale;

				c.scale.x = c.scale.y = scale;
				c.x = -b.x + (width - b.width) / 2;
				c.y = -b.y + (height - b.height) / 2;
			} else {
				b2.y += cropTop;
				b2.height -= cropTop + cropBottom;
				b2.x += cropLeft;
				b2.width -= cropLeft + cropRight;
				if(b2.x < 0 ) {
					b2.x = Math.floor(b2.x);
				} else {
					b2.x = Math.ceil(b2.x);
				}
				if(b2.y < 0 ) {
					b2.y = Math.floor(b2.y);
				} else {
					b2.y = Math.ceil(b2.y);
				}
			}

			canvas = game.pixiApp.renderer.plugins.extract.canvas(c2);

			let png = await new Promise((resolve) => {
				canvas.toBlob(resolve, 'image/png');
			});
			object.visible = tmpVisible;
			delete c.getLocalBounds;
			delete c2.getLocalBounds;
			object.filters = f;
			if(oldParent) {
				oldParent.addChildAt(object, oldIndex);
			}else {
				object.detachFromParent();
			}
			editor.ui.modal.hideSpinner();
			return png;
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
		editor.settings.removeItem('__EDITOR-clipboard-data-timeline-name');
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
			editor.ui.modal.showInfo(R.div(null,
				"click to open: ",
				R.a({href: url, target: '_blank'}, url),
				R.br(),
				"Check browser's status bar to allow automatic opening after build."
			), "building finished.", 30011);
		}
	}

	cloneSelected(dragObject) {
		if(editor.selection.some((o) => o.parent === game.stage)) {
			editor.ui.modal.showInfo('Can not clone root object', '', 30017);
			return;
		}

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
			let cloneExData = __getNodeExtendData(clone);
			let exData = __getNodeExtendData(o);
			if(exData.hidePropsEditor) {
				cloneExData.hidePropsEditor = exData.hidePropsEditor;
			}
			if(exData.rotatorLocked) {
				cloneExData.rotatorLocked = exData.rotatorLocked;
			}
			if(exData.noSerialize) {
				cloneExData.noSerialize = exData.noSerialize;
			}
			cloneExData.__isJustCloned = true;
			
			increaseNameNumber(clone);

			let i = o.parent.children.indexOf(o) + 1;
			while(o.parent.children[i] && ((allCloned.indexOf(o.parent.children[i]) >= 0) || __getNodeExtendData(o.parent.children[i]).isSelected)) {
				i++;
			}
			o.parent.addChildAt(clone, i);

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

		DataPathFixer.validatePathReferences();
		for(let c of allCloned) {
			let cloneExData = __getNodeExtendData(c);
			cloneExData.__isJustCloned = false;
		}
		editor.refreshTreeViewAndPropertyEditor();
		editor.sceneModified();
		return ret;
	}

	wrapSelected(className) {
		assert(game.__EDITOR_mode, "Can not wrap in running mode.");

		let isClipboardWrapping = ((typeof className) !== 'string');

		if(editor.selection.length < 1) {
			assert(false, 'Nothing selected to be wrapped.');
		} else if(isClipboardWrapping && (!editor.clipboardData || editor.clipboardData.length !== 1)) {
			editor.ui.status.error('Exactly one container should be copied in to clipBoard to wrap selection with it.');
		} else {
			let a = editor.selection.slice(0);

			let o = a[0];
			let parent = o.parent;
			for(let c of a) {
				if(c.parent !== parent) {
					editor.ui.modal.showInfo('Selected object should have same parent to be wrapped.', 'Can not wrap', 30012);
					return;
				}
			}


			if(o instanceof Scene) {
				editor.ui.modal.showInfo("Scene can not be wrapped, you can change scene's type instead.", 'Can not wrap', 30013);
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
				w = Lib._deserializeObject({c: editor.clipboardData[0].c, p: editor.clipboardData[0].p});
				editor.disableFieldsCache = false;
			}
			if(!(w instanceof OrientationTrigger)) {
				w.x = 0;
				w.y = 0;
			}
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
		return !o.constructor.__canNotHaveChildren;
	}

	isCanBeAdded() {
		let o = editor.selection[0];
		return !o || !o.constructor.__canNotHaveChildren;
	}

	onEditorRenderResize() {
		editor.refreshTreeViewAndPropertyEditor();
		if(editor.overlay) {
			editor.overlay.onEditorRenderResize();
			editor.ui.viewport.forceUpdate();
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
		if(refreshTreeViewAndPropertyEditorScheduled || document.fullscreenElement) return;
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

	onObjectsPropertyChanged(o, field, val, delta) {
		assert((!delta) || (typeof delta === 'boolean'), "Delta expected to be bool");
		let changed = false;
		if(typeof field === 'string') {
			field = editor.getObjectField(o, field);
		}
		
		this.beforePropertyChanged.emit(o, field.name, field, val, delta);
		
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
		
		this.afterPropertyChanged.emit(o, field.name, field, val, delta);
		
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
			return R.div({key, className: 'list-item stack-item', onMouseDown: () => {
				let a = i.path.split(':');
				editor.fs.editFile('/' + a[0], parseInt(a[1]), parseInt(a[2]));
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
		Pool.__resetIdCounter();
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
		this.regenerateCurrentSceneMapTypings();
	}

	_getImportSrcForClass(className) {
		return 'import ' + className + ' from "' + ClassesLoader.getClassPath(className) + '";';
	}

	regenerateCurrentSceneMapTypings() {
		if(editor.editorArguments['no-vscode-integration']) {
			return;
		}
		if(!game.currentScene || !game.__EDITOR_mode) {
			return;
		}
		let json = {};
		game.currentScene._refreshAllObjectRefs();
		for(let n of Object.keys(game.currentScene.all)) {
			try {
				let className = game.all[n].constructor.name;
				if(className === 'PrefabReference') {
					className = this.getClassNameOfPrefab(PrefabsList.getPrefabNameFromPrefabRef(game.all[n]));
				}
				json[n] = className;
			} catch(er) {} // eslint-disable-line no-empty
		}
		let jsonString = JSON.stringify(json);
		if(editor.__currentAllMap !== jsonString) {
			editor.__currentAllMap = jsonString;

			let classesList = [];
			let imports = [];
			let declarations = [];
			
			for(let className in Lib.classes) {
				imports.push(editor._getImportSrcForClass(className));
				classesList.push(className + ': typeof ' + className + ';');
			}
			
			for(let name of Object.keys(json)) {
				let className = json[name];
				if(Scene.__refsCounter[name] > 1) {
					declarations.push(`/**
					* @deprecated ${Scene.__refsCounter[name]} objects with that name exist on scene
					*/`);
				}
				declarations.push('"' +name + '":' + ((className==='Container') ? 'PIXI.Container' : className) + ';');
			}

			let mapJS = `// thing-editor auto generated file.

import * as PIXI from ` + `"pixi.js"; // '+' - to prevent import path fixing

export default null;
`
+ imports.join('\n') +
`
declare global {
	type CurrentSceneType = ` + game.currentScene.constructor.name + `;

	interface ThingProjectClassesList {
		` +
		classesList.join('\n')
	+ `
	}

	interface ThingSceneAllMap {
		[key: string]: PIXI.Container;
`
+ declarations.join('\n') +
	`}
}
`;
			fs.saveFile('/current-scene-typings.d.ts', mapJS, true, true);
		}
	}

	regeneratePrefabsTypings() {

		if(editor.editorArguments['no-vscode-integration']) {
			return;
		}
		if(!game.currentScene || !game.__EDITOR_mode) {
			return;
		}
		let json = {};
		let classes = {};

		for(let n in Lib.prefabs) {
			let className = this.getClassNameOfPrefab(n);
			json[n] = className;
			classes[className] = true;
		}
		let jsonString = JSON.stringify(json);
		if(editor.__currentPrefabsMap !== jsonString) {
			editor.__currentPrefabsMap = jsonString;

			let imports = [];
			let declarations = [];
			
			for(let prefabName in json) {
				declarations.push("loadPrefab(prefabName: '" + prefabName + "'):" + json[prefabName] + ";");
			}
			for(let className in classes) {
				imports.push(editor._getImportSrcForClass(className));
			}

			let mapJS = `// thing-editor auto generated file.
`
+ imports.join('\n') +
`
export default class TLib {
`
+ declarations.join('\n') + `
loadPrefab(prefabName:string) {
	return null;
}
}`;
			fs.saveFile('/prefabs-typing.ts', mapJS, true, true);
		}
	}

	getClassNameOfPrefab(prefabName) {
		let className = Lib.prefabs[prefabName].c;
		while(className === 'PrefabReference') {
			prefabName = Lib.prefabs[prefabName].p && PrefabsList.getPrefabNameFromPrefabRef(Lib.prefabs[prefabName].p);
			if(prefabName && Lib.prefabs[prefabName]) {
				className = Lib.prefabs[prefabName].c;
			} else {
				break;
			}
		}
		return className;
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
			let p = c.getGlobalPosition();
			__getNodeExtendData(c).globalPos = p;
			let p2 = o.toLocal(p);
			if(isNaN(p2.x) || isNaN(p2.y)) {
				editor.ui.status.warn("Object has zero scale and can not be moved without affecting children`s positions.", 30023, o);
				return;
			}
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
			editor.ui.modal.showError("access to isCurrentSceneModified in prefab mode", 90001);
		}
		return this.isCurrentContainerModified;
	}
	
	editClassSource(c) {
		if(editor.editorArguments['no-vscode-integration']) {
			return;
		}
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
		for(let f of editor.checkSceneHandlers) {
			f();
		}

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

	_getProjectViewportSize(doNotFixOrientation) {
		if (game.projectDesc.screenOrientation === 'auto') {
			if(!doNotFixOrientation) {
				game.___enforcedOrientation = 'landscape';
			}
			return {
				w: game.projectDesc.width,
				h: game.projectDesc.height
			};
		} else if (game.projectDesc.screenOrientation === 'portrait') {
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

	_callInPortraitMode(callback) {
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
	
	build(debug) {
		return new Promise((resolve) => {
			if(editor.buildProjectAndExit) {
				if((debug && editor.editorArguments['skip-debug-build']) ||
					(!debug && editor.editorArguments['skip-release-build'])) {
					resolve();
					return;
				}
			}
			editor.askSceneToSaveIfNeed().then(() => {
				build.build(debug).then(resolve);
			});
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
		if(node instanceof DisplayObject) {
			for(let p of editor.enumObjectsProperties(node)) {
				if(node[p.name] === fieldValue) {
					return p.name;
				}
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
			editor.ui.status.warn("Looks like you stopped on caught exception, probably you need to disable 'stop on caught exception' option in your debugger.", 30014);
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
	Lib.__invalidateSerializationCache(child);
	if(!doNotSelect) {
		editor.ui.sceneTree.selectInTree(child);
		editor.sceneModified(true);
	}
	callInitIfGameRuns(child);
}

function __callInitIfNotCalled(node) {
	assert(!game.__EDITOR_mode, "Attempt to init object in editor mode.");
	if(!node._thing_initialized) {
		Lib._constructRecursive(node);
	}
}

function callInitIfGameRuns(node) {
	if(!game.__EDITOR_mode) {
		__callInitIfNotCalled(node);
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

	//cleanup settings for deleted textures
	let loadOnDemandTextures = editor.projectDesc.loadOnDemandTextures;
	a = Object.keys(loadOnDemandTextures);
	for(let k of a) {
		if(!Lib.__hasTextureEvenUnloaded(k)) {
			delete loadOnDemandTextures[k];
			isCleanedUp = true;
		}
	}

	let loadOnDemandFolders = editor.projectDesc.__loadOnDemandTexturesFolders;
	a = Object.keys(loadOnDemandFolders);
	for(let k of a) {
		let k2 = k + '/';
		if(!Lib.__texturesList.find(t => t.name.startsWith(k2))) {
			delete loadOnDemandFolders[k];
			isCleanedUp = true;
		}
	}

	setTimeout(TexturesView.applyFoldersPropsToAllImages, 0);

	let descToSave = Object.assign({}, editor.projectDesc);

	if(!cleanOnly || isCleanedUp) {
		for(let key in editor.fs.libsSettings) {
			if(descToSave.hasOwnProperty(key)) {
				if(JSON.stringify(descToSave[key]) === JSON.stringify(editor.fs.libsSettings[key])) {
					delete descToSave[key];
				}
			}
		}
		editor.fs.saveFile('thing-project.json', descToSave);
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

function timeout(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
