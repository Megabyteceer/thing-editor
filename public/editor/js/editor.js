import utils from './utils/editor-utils.js';
import Game from '/engine/js/game.js';
import Settings from '/engine/js/utils/settings.js';
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
import Lib from "/engine/js/lib.js";

export default class Editor {
	
	get editorFilesPrefix() {
		return '.editor-tmp.';
	}
	
	get runningSceneLibSaveSlotName() {
		return this.editorFilesPrefix + 'save';
	}
	
	constructor() {
		
		window.editor = this;
		
		this.tryToSaveHistory = tryToSaveHistory;
		
		this.currenGamePath = 'games/game-1';
		this.fs = fs;
		
		this.settings = new Settings('editor');
		this.selection = new Selection();
		
		this.initResize();
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
	}
	
	/**
	 *
	 * @param ui {UI}
	 */
	onUIMounted(ui) {
		/** @member {UI} */
		this.ui = ui;
		this.game = new Game('tmp.game.id');
		
		game.__EDITORmode = true;
		game.init(document.getElementById('viewport-root'));
		
		this.overlay = new Overlay();
		
		ClassesLoader.init();
		AssetsLoader.init();
		this.openProject();
	}
	
	openProject(dir) {
		askSceneToSaveIfNeed().then(() => {
			if (!dir) {
				dir = editor.settings.getItem('last-opened-project');
			}
			if (!dir) {
				this.fs.chooseProject(true);
			} else if (dir !== editor.currentProjectDir) {
				this.fs.getJSON('/fs/openProject?dir=' + dir).then((data) => {
					this.fs.refreshFiles().then(() => {
						editor.currentProjectDir = dir;
						editor.settings.setItem('last-opened-project', dir);
						this.fs.gameFolder = '/games/' + dir + '/';
						editor.projectDesc = data;
						this.clipboardData = null;
						editor.reloadAssetsAndClasses().then(() => {
							Promise.all([ScenesList.readAllScenesList(), PrefabsList.readAllPrefabsList()]).then(() => {
								
								if (Lib.hasScene(editor.runningSceneLibSaveSlotName)) {
									//backup restoring
									editor.ui.modal.showQuestion("Scene's backup restoring",
										R.fragment(R.div(null, "Looks like previous session was finished incorrectly."),
											R.div(null, "Do you want to restore scene from backup?")),
										() => {
											this.openSceneSafe(editor.runningSceneLibSaveSlotName, editor.projectDesc.lastSceneName).then(() => {
												editor.history.currentState._isModified = true;
											});
										}, 'Restore backup',
										() => {
											this.openSceneSafe(editor.projectDesc.lastSceneName || 'main').then(() => {
												Lib.__deleteScene(editor.runningSceneLibSaveSlotName);
											});
										}, 'Delete backup',
										true
									);
								} else {//open last project's scene
									this.openSceneSafe(editor.projectDesc.lastSceneName || 'main');
								}
							});
						});
					});
				});
			}
		});
	}
	
	openSceneSafe(name, renameAfterOpening) {
		return askSceneToSaveIfNeed(ScenesList.isSpecialSceneName(name)).then(() => {
			this.loadScene(name);
			if(renameAfterOpening) {
				assert(typeof renameAfterOpening === 'string', 'String expected');
				name = renameAfterOpening;
				game.currentScene.name = renameAfterOpening;
			}
			saveCurrentSceneName(name);
			history.clearHistory(Lib.scenes[name]);
			history.setCurrentStateUnmodified();
			this.ui.forceUpdate();
		});
	}
	
	get currentSceneName() {
		if(!window.game) return null;
		var a = game.__getScenesStack();
		if(a.length > 0) {
			return a[0].name;
		}
		return game.currentScene ? game.currentScene.name : null;
	}
	
	initResize() {
		var onResize = () => {
			this.W = window.innerWidth;
			this.H = window.innerHeight;
		}
		
		$(window).on('resize', onResize);
		onResize();
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
		var needRepairScene = game.currentScene != null;
		if (needRepairScene) {
			this.saveCurrentScene(editor.runningSceneLibSaveSlotName);
			var selectionData = editor.selection.saveSelection();
		}
		
		return ClassesLoader.reloadClasses().then(() => {
			if (needRepairScene) {
				this.loadScene(editor.runningSceneLibSaveSlotName);
				editor.selection.loadSelection(selectionData);
			}
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
		if (this.selection.length > 0) {
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
		if (this.selection.length > 0) {
			if (typeof field === 'string') {
				field = editor.getObjectField(this.selection[0], field);
			}
			var changed = false;
			
			this.beforePropertyChanged.emit(field.name);
			
			if (delta === true) {
				assert(field.type === Number);
				for (let o of this.selection) {
					var v = o[field.name];
					var newVal = v + val;
					if (field.hasOwnProperty('min')) {
						newVal = Math.max(field.min, newVal);
					}
					if (field.hasOwnProperty('max')) {
						newVal = Math.min(field.max, newVal);
					}
					if(v !== newVal) {
						o[field.name] = newVal;
						changed = true;
					}
				}
			} else {
				for (let o of this.selection) {
					if (o[field.name] != val) {
						o[field.name] = val;
						changed = true;
					}
				}
			}
			
			this.afterPropertyChanged.emit(field.name);
			
			if (changed) {
				this.refreshTreeViewAndPropertyEditor();
				editor.sceneModified();
			}
		}
	}
	
	/**
	 * enumerate all editable properties of given DisplayObject.
	 */
	enumObjectsProperties(o) {
		return o.constructor.EDITOR_propslist_cache;
	}
	
	getObjectField(o, name) {
		return editor.enumObjectsProperties(o).find((f) => {
			return f.name === name;
		});
	}
	
	loadScene(name) {
		assert(name, 'name should be defined');
		if (game.currentScene) {
			selectionsForScenesByName[editor.currentSceneName] = this.selection.saveSelection();
		}
		idCounter = 0;
		game.showScene(name);
		if (game.currentScene) {
			this.selection.loadSelection(selectionsForScenesByName[name]);
		}
		
		if (name === editor.runningSceneLibSaveSlotName) {
			Lib.__deleteScene(editor.runningSceneLibSaveSlotName);
		}
		this.refreshTreeViewAndPropertyEditor();
	}
	
	saveProjecrDesc() {
		debouncedCall(__saveProjectDescriptorInner);
	}
	
	sceneModified(saveImmidiatly) {
		if (game.__EDITORmode) {
			needHistorySave = true;
			if(saveImmidiatly === true) {
			    tryToSaveHistory();
            }
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
	
	saveCurrentScene(name) {
		editor.ui.viewport.stopExecution();
		if(!name) {
			name = editor.currentSceneName;
		}
		assert(name, "Name can't be empty");
		assert(game.__EDITORmode, "tried to save scene in runnig mode.");
		if (editor.isCurrentSceneModified || (editor.currentSceneName !== name)) {
			Lib.__saveScene(game.currentScene, name);
			if (!ScenesList.isSpecialSceneName(name)) {
				history.setCurrentStateUnmodified();
				saveCurrentSceneName(name);
			}
		}
	}
}

function askSceneToSaveIfNeed(skip) {
    editor.exitPrefabMode();
	if (!skip && editor.isCurrentSceneModified) {
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
	if (editor.projectDesc.lastSceneName != name) {
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
	editor.fs.saveFile('project.json', editor.projectDesc);
}

var selectionsForScenesByName = {};

var needHistorySave = false;
var tryToSaveHistory = () => {
	if (needHistorySave) {
		history.addHistoryState();
		needHistorySave = false;
	}
};

$(window).on('mouseup', tryToSaveHistory);
$(window).on('keyup', tryToSaveHistory);

var idCounter = 0;
let editorNodeData = new WeakMap();
window.__getNodeExtendData = (node) => {
	if (!editorNodeData.has(node)) {
		editorNodeData.set(node, {id: idCounter++});
	}
	return editorNodeData.get(node);
};
window.__resetNodeExtendData = (node) => {
	if (editorNodeData.has(node)) {
		if(editorNodeData.get(node).isSelected) {
			editor.selection.remove(node);
		}
	}
	editorNodeData.delete(node);
};