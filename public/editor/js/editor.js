import Game from '/engine/js/game.js';
import Settings from '/engine/js/utils/settings.js';
import Selection from './utils/selection.js';
import ws from './utils/socket.js';
import fs from './utils/fs.js';
import UI from './ui/ui.js';
import ClassesLoader from './utils/classes-loader.js';

import MainScene from '/games/game-1/src/scenes/main-scene.js';

class Editor {
	
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
		
		
		ReactDOM.render(
			React.createElement(UI, {onMounted: this.onUIMounted}),
			document.getElementById('root')
		);
	}
	
	onUIMounted(ui) {
		this.ui = ui;
		this.game = new Game('tmp.game.id');
		
		Lib.wrapConstructorProcessor(applyEditorDataToNode);
		
		Lib.__saveScene(new MainScene(), 'main');
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
					EDITOR.reloadAll().then(() => {
						this.loadScene(EDITOR.projectDesc.currentScene || 'main');
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
		assert(game.__EDITORmode, 'tried to reload classes in running mode.');
		this.saveCurrentScene();
		return ClassesLoader.reloadClasses();
	}
	
	reloadAssets() {
	
	}
	
	reloadAll() {
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
		var c = o.constructor;
		if (!c.hasOwnProperty('EDITOR_propslist_cache')) {
			
			var cc = c;
			var props = [];
			var i = 50;
			while (cc && (i-- > 0)) {
				if (!cc.prototype) {
					throw 'attempt to enum editable properties of not PIXI.DisplayObject instance';
				}
				if (cc.hasOwnProperty('EDITOR_editableProps')) {
					var addProps = cc.EDITOR_editableProps;
					
					if (addProps.some((p) => {
							if (p.type === 'splitter') {
								p.noSave = true;
							}
							return props.some((pp) => {
								return pp.name === p.name
							});
						})) {
						this.ui.showError('redefenition of property "' + pp.name + '"');
					}
					
					props = addProps.concat(props);
				}
				if (cc === PIXI.DisplayObject) {
					break;
				}
				cc = cc.__proto__;
			}
			c.EDITOR_propslist_cache = props;
		}
		return c.EDITOR_propslist_cache;
	}
	
	getObjectField(o, name) {
		return EDITOR.enumObjectsProperties(o).find((f) => {
			return f.name === name
		});
	}
	
	loadScene(name = "EDITOR:tmp") {
		game.showScene(Lib.loadScene(name));
		EDITOR.projectDesc.currentScene = name;
		this.selection.select(game.currentScene);
		this.refreshTreeViewAndPropertyEditor();
	}
	
	saveCurrentScene(name = "EDITOR:tmp") {
		assert(game.__EDITORmode, "tried to save scene in runnig mode.");
		Lib.__saveScene(game.currentScene, name);
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