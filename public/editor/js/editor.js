import Game from '/engine/js/game.js';
import Settings from '/engine/js/utils/settings.js';
import Selection from './utils/selection.js';
import ws from './utils/socket.js';
import fs from './utils/fs.js';
import UI from './ui/ui.js';
import ClassesLoader from './utils/classes-loader.js';
import ScenesList from "./ui/scenes-list.js";
import PropsFieldWrapper from "./ui/props-editor/props-field-wrapper.js";


class Editor {
	
    get editorFilesPrefix() {
        return '.editor-tmp.';
    }
    
	constructor() {
		
		window.EDITOR = this;
		Object.defineProperty(PIXI.DisplayObject.prototype, '__editorData', {
			get: () => {
				throw "No __editorData field found for " + this.constructor.name + '. To create game objects use code: Lib.create(\'name\')';
			}
		});
		
		this.currenGamePath = 'games/game-1';
		this.fs = fs;
		
		this.settings = new Settings('EDITOR');
		this.selection = new Selection();
		
		this.initResize();
		this.ClassesLoader = ClassesLoader;
		
		this.onUIMounted = this.onUIMounted.bind(this);
		this.onSelectedPropsChange = this.onSelectedPropsChange.bind(this);
		this.reloadClasses = this.reloadClasses.bind(this);
		
		this.sceneOpened = new Signal();
		
		ReactDOM.render(
			React.createElement(UI, {onMounted: this.onUIMounted}),
			document.getElementById('root')
		);
	}
	
	onUIMounted(ui) {
		this.ui = ui;
		this.game = new Game('tmp.game.id');
		
		Lib.wrapConstructorProcessor(applyEditorDataToNode);
		
		Lib.addTexture('bunny', PIXI.Texture.fromImage('editor/img/pic1.png'));
		
		game.__EDITORmode = true;
		game.init(document.getElementById('viewport-root'));
		applyEditorDataToNode(game.stage);
		
		ClassesLoader.init();
		this.openProject();
	}
	
	openProject(dir) {
		if (!dir) {
			dir = EDITOR.settings.getItem('last-opened-project');
		}
		if (!dir) {
			this.fs.chooseProject(true);
		} else {
			this.fs.getJSON('/fs/openProject?dir=' + dir).then((data) => {
				this.fs.refreshFiles().then(() => {
					EDITOR.settings.setItem('last-opened-project', dir);
					this.fs.gameFolder = '/games/' + dir + '/';
					EDITOR.projectDesc = data;
					EDITOR.reloadAssetsAndClasses().then(() => {
                        ScenesList.loadScenes().then(() => {
                            this.loadScene(EDITOR.projectDesc.currentSceneName || 'main');
                        })
					});
				});
			});
		}
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
		if(needRepairScene) {
			this.saveCurrentScene();
		}
		
		return ClassesLoader.reloadClasses().then(()=>{
			if(needRepairScene) {
				this.loadScene();
			}
		});
	}
	
	reloadAssets() {
		return Promise.resolve();
	}
	
	reloadAssetsAndClasses() {
		return Promise.all([
			this.reloadClasses(),
			this.reloadAssets()
		]);
	}
	
	addToSelected(o) {
		if (this.selection.length > 0) {
			addTo(this.selection[0], o);
		}
	}
	
	addToScene(o) {
		addTo(game.currentScene, o);
	}
	
	/**
	 * set propery value received frop property editor
	 */
	
	onSelectedPropsChange(field, val) {
		if (typeof field === 'string') {
			field = EDITOR.getObjectField(this.selection[0], field)
		}
		for (let o of this.selection) {
			o[field.name] = val;
		}
		this.refreshTreeViewAndPropertyEditor();
	}
	
	/**
	 * enumerate all editable properties of given DisplayObject.
	 */
	enumObjectsProperties(o) {
		return o.constructor.EDITOR_propslist_cache;
	}
	
	getObjectField(o, name) {
		return EDITOR.enumObjectsProperties(o).find((f) => {
			return f.name === name
		});
	}
	
	loadScene(name = EDITOR.editorFilesPrefix + "tmp") {
		game.showScene(Lib.loadScene(name));
        this.selection.select(game.currentScene);
        if(!ScenesList.isSpecialSceneName(name)) {
            EDITOR.projectDesc.currentSceneName = name;
        }
        this.ui.forceUpdate();
        this.sceneOpened.emit(); //TODO: ? remove this signal?
	}
	
	saveCurrentScene(name = EDITOR.editorFilesPrefix + "tmp") {
	    EDITOR.ui.viewport.stopExecution();
		assert(game.__EDITORmode, "tried to save scene in runnig mode.");
		Lib.__saveScene(game.currentScene, name);
        if(!ScenesList.isSpecialSceneName(name)) {
            if(EDITOR.projectDesc.currentSceneName != name) {
                EDITOR.projectDesc.currentSceneName = name;
                this.ui.forceUpdate();
            }
        }
	}
}

function addTo(parent, child) {
	parent.addChild(child);
	EDITOR.ui.sceneTree.select(child);
}



//====== extend DisplayObjct data for editor time only ===============================
var idCounter = 0;
var __editorDataPropertyDescriptor = {writable: true};
var applyEditorDataToNode = (n) => {
	Object.defineProperty(n, '__editorData', __editorDataPropertyDescriptor);
	n.__editorData = {id: idCounter++};
}

export default Editor;