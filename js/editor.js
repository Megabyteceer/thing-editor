import utils from './utils/editor-utils.js';
import Game from '/thing-engine/js/game.js';
import Settings from '/thing-engine/js/utils/settings.js';
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
import Lib from "/thing-engine/js/lib.js";
import build from "./utils/build.js";
import Pool from "/thing-engine/js/utils/pool.js";
import LanguageView from "./ui/language-view.js";
import Timeline from "./ui/props-editor/timeline/timeline.js";

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
		
		this.tryToSaveHistory = tryToSaveHistory;
		
		this.currenGamePath = 'games/game-1';
		this.fs = fs;
		
		this.settings = new Settings('editor');
		this.selection = new Selection();
		
		this.ClassesLoader = ClassesLoader;
		this.AssetsLoader = AssetsLoader;
		
		this.onUIMounted = this.onUIMounted.bind(this);
		this.onSelectedPropsChange = this.onSelectedPropsChange.bind(this);
		this.reloadClasses = this.reloadClasses.bind(this);
		
		this.history = history;
		
		this.beforePropertyChanged = new Signal();
		this.afterPropertyChanged = new Signal();
		
		ReactDOM.render(
			React.createElement(UI, {onMounted: this.onUIMounted}),
			document.getElementById('root')
		);
		
		Timeline.init();
	}
	
	/**
	 *
	 * @param ui {UI}
	 */
	onUIMounted(ui) {
		/** @member {UI} */
		this.ui = ui;
		new Game('tmp.game.id');
		
		game.__EDITORmode = true;
		game.init(document.getElementById('viewport-root'));
		
		utils.protectAccessToSceneNode(game.stage, "game stage");
		utils.protectAccessToSceneNode(game.stage.parent, "PIXI stage");
		
		this.overlay = new Overlay();
		
		ClassesLoader.initClassesLoader();
		AssetsLoader.init();
		this.openProject();
	}
	
	async openProject(dir) {
		editor.ui.viewport.stopExecution();
		await askSceneToSaveIfNeed();
		
		let lastOpenedProject = editor.settings.getItem('last-opened-project');
		if(!dir) {
			dir = lastOpenedProject;
		}
		if(!dir) {
			this.fs.chooseProject(true);
		} else if(dir !== editor.currentProjectDir) {
			editor.settings.setItem('last-opened-project', dir);
			if(dir != lastOpenedProject) {
				location.reload();
			}

			let data = await this.fs.getJSON('/fs/openProject?dir=' + dir);
			if(!data) {
				editor.settings.setItem('last-opened-project', false);
				editor.ui.modal.showError("Can't open project " + dir).then(() => {this.openProject();});
				return;
			}
			game.__clearStage();
			Pool.clearAll();
			await this.fs.refreshFiles();
			editor.currentProjectDir = dir;
			this.fs.gameFolder = '/games/' + dir + '/';
			editor.projectDesc = data;
			
			await Promise.all([editor.reloadAssetsAndClasses(), ScenesList.readAllScenesList(), PrefabsList.readAllPrefabsList(), LanguageView.loadTextData()]);
			
			if(editor.projectDesc.lastSceneName && !Lib.hasScene(editor.projectDesc.lastSceneName)) {
				editor.projectDesc.lastSceneName = false;
			}
			
			if(Lib.hasScene(editor.backupSceneLibSaveSlotName)) {
				//backup restoring
				editor.ui.modal.showQuestion("Scene's backup restoring",
					R.fragment(R.div(null, "Looks like previous session was finished incorrectly."),
						R.div(null, "Do you want to restore scene from backup?")),
					async() => {
						await this.openSceneSafe(editor.backupSceneLibSaveSlotName, editor.projectDesc.lastSceneName || 'restored-from-backup');
						editor.history.currentState._isModified = true;
						
					}, 'Restore backup',
					async() => {
						await this.openSceneSafe(editor.projectDesc.lastSceneName || 'main');
						Lib.__deleteScene(editor.backupSceneLibSaveSlotName);
					}, 'Delete backup',
					true
				);
			} else {//open last project's scene
				await this.openSceneSafe(editor.projectDesc.lastSceneName || 'main');
			}
		}
	}
	
	set clipboardData(cd) {
		editor.settings.setItem('__EDITOR-clipboard-data', cd);
	}
	
	get clipboardData() {
		return editor.settings.getItem('__EDITOR-clipboard-data');
	}
	
	openSceneSafe(name, renameAfterOpening) {
		return askSceneToSaveIfNeed(ScenesList.isSpecialSceneName(name)).then(() => {
			this.loadScene(name);
			document.title = '(' + editor.projectDesc.title + ') - - (' + name + ')';
			if(renameAfterOpening) {
				assert(typeof renameAfterOpening === 'string', 'String expected');
				name = renameAfterOpening;
				game.currentScene.name = renameAfterOpening;
			}
			saveCurrentSceneName(name);
			history.clearHistory();
			history.setCurrentStateUnmodified();
			this.ui.forceUpdate();
		});
	}
	
	saveBackup(includeUnmodified = false) {
		if(!game.__EDITORmode) {
			assert(!includeUnmodified, 'Attempt to save important backup in running mode');
			return;
		}

		if(!game.currentScene) {
			assert(!includeUnmodified, 'Attempt to save important backup when project was not loaded yet.');
			return;
		}

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
		if(!game.__EDITORmode) {
			assert(!includeUnmodified, 'Attempt to restore important backup in running mode');
			return;
		}
		
		if(!savedBackupName) {
			assert(!includeUnmodified, 'No backup scene was saved bofore restoreing important backup.');
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
		if(!window.game) return null;
		let a = game._getScenesStack();
		if(a.length > 0) {
			return a[0].name;
		}
		return game.currentScene ? game.currentScene.name : null;
	}
	
	refreshPropsEditor() {
		this.ui.propsEditor.forceUpdate();
	}
	
	refreshTreeViewAndPropertyEditor() {
		this.ui.sceneTree.forceUpdate();
		this.refreshPropsEditor();
	}
	
	reloadClasses() {
		this.ui.viewport.stopExecution();
		assert(game.__EDITORmode, 'tried to reload classes in running mode.');
		editor.saveBackup();
		
		return ClassesLoader.reloadClasses().then(() => {
			editor.restoreBackup();
		});
	}
	
	reloadAssets() {
		return AssetsLoader.reloadAssets();
	}
	
	reloadAssetsAndClasses() {
		return Promise.all([
			this.reloadClasses(),
			this.reloadAssets()
		]);
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
			let changed = false;
			
			this.beforePropertyChanged.emit(field.name, field);
			
			if(delta === true) {
				assert(field.type === Number);
				for(let o of this.selection) {
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
				}
			} else {
				for(let o of this.selection) {
					if(o[field.name] != val) {
						o[field.name] = val;
						changed = true;
					}
				}
			}
			
			this.afterPropertyChanged.emit(field.name, field);
			
			if(changed) {
				this.refreshTreeViewAndPropertyEditor();
				editor.sceneModified();
			}
		}
	}
	
	/**
	 * enumerate all editable properties of given DisplayObject.
	 */
	enumObjectsProperties(o) {
		return o.constructor.__EDITOR_propslist_cache;
	}
	
	getObjectField(o, name) {
		return editor.enumObjectsProperties(o).find((f) => {
			return f.name === name;
		});
	}
	
	loadScene(name) {
		assert(name, 'name should be defined');
		if(game.currentScene) {
			selectionsForScenesByName[editor.currentSceneName] = this.selection.saveSelection();
		}
		idCounter = 0;
		game.applyProjectSettings(editor.projectDesc);
		game.showScene(name);
		
		if(game.currentScene) {
			this.selection.loadSelection(selectionsForScenesByName[name]);
		}
		
		if(name === editor.backupSceneLibSaveSlotName) {
			Lib.__deleteScene(editor.backupSceneLibSaveSlotName);
		}
		this.refreshTreeViewAndPropertyEditor();
	}
	
	saveProjecrDesc() {
		debouncedCall(__saveProjectDescriptorInner);
	}
	
	sceneModified(saveImmidiatly) {
		if(game.__EDITORmode) {
			needHistorySave = true;
			if(saveImmidiatly === true) {
				tryToSaveHistory();
			}
		}
	}
	
	centraliseObjectToContent (o) {
		let b = o.getBounds();
		let midX = Math.round(b.x + b.width / 2);
		let midY = Math.round(b.y + b.height / 2);
		this.moveContainerWithoutChildren(o, midX - o.x, midY - o.y);
	}
	
	moveContainerWithoutChildren(o, dX, dY) {
		editor.shiftObject(o, dX, dY);
		o.children.some((c) => {
			editor.shiftObject(c, -dX, -dY);
		});
		editor.ui.sceneTree.selectInTree(o);
	}
	
	shiftObject(o, dx, dy) {
		if(dx !== 0 || dy !== 0) {
			editor.ui.sceneTree.selectInTree(o);
			// Shift wrapped object to zero. If it is MovieClip its will shift all timeline.
			Timeline.disableRecording();
			if (dx !== 0) {
				editor.onSelectedPropsChange('x', dx, true);
			}
			if (dy !== 0) {
				editor.onSelectedPropsChange('y', dy, true);
			}
			Timeline.enableRecording();
		}
	}
	
	exitPrefabMode() {
		if(editor.ui.prefabsList) {
			PrefabsList.acceptPrefabEdition();
		}
	}
	
	get isCurrentSceneModified() {
		return history.isStateModified;
	}
	
	editClassSource(c) {
		let filePath = editor.ClassesLoader.getClassPath(c.name);
		editor.fs.editFile(filePath);
	}
	
	saveCurrentScene(name) {
		editor.ui.viewport.stopExecution();
		if(!name) {
			name = editor.currentSceneName;
		}
		assert(name, "Name can't be empty");
		assert(game.__EDITORmode, "tried to save scene in runnig mode.");
		if(editor.isCurrentSceneModified || (editor.currentSceneName !== name)) {
			Lib.__saveScene(game.currentScene, name);
			if(!ScenesList.isSpecialSceneName(name)) {
				history.setCurrentStateUnmodified();
				saveCurrentSceneName(name);
			}
		}
	}
	
	build() {
		askSceneToSaveIfNeed().then(() => {
			build.build();
		});
	}
}

function askSceneToSaveIfNeed(skip) {
	editor.exitPrefabMode();
	if(!skip && editor.isCurrentSceneModified) {
		return new Promise((resolve) => {
			
			editor.ui.modal.showQuestion('Scene was modified.', 'Do you want to save the changes in current scene?',
				() => {
					editor.saveCurrentScene();
					resolve();
				}, 'Save',
				() => {
					resolve();
					
				}, 'No save'
			)
		});
	} else {
		return Promise.resolve();
	}
}

function saveCurrentSceneName(name) {
	if(editor.projectDesc.lastSceneName !== name) {
		editor.projectDesc.lastSceneName = name;
		editor.saveProjecrDesc();
		editor.ui.forceUpdate();
	}
}

function addTo(parent, child, doNotselect) {
	parent.addChild(child);
	if(!doNotselect) {
		editor.ui.sceneTree.selectInTree(child);
		editor.sceneModified(true);
	}
}

let __saveProjectDescriptorInner = () => {
	editor.fs.saveFile('thing-project.json', editor.projectDesc);
};

let savedBackupName;
let savedBackupSelectionData;

let selectionsForScenesByName = {};

let needHistorySave = false;
let tryToSaveHistory = () => {
	if(needHistorySave) {
		history.addHistoryState();
		needHistorySave = false;
	}
};

$(window).on('mouseup', tryToSaveHistory);
$(window).on('keyup', tryToSaveHistory);

let idCounter = 0;
let editorNodeData = new WeakMap();
window.__getNodeExtendData = (node) => {
	if(!editorNodeData.has(node)) {
		editorNodeData.set(node, {id: idCounter++});
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