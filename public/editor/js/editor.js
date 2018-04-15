import Game from '/engine/js/game.js';
import Settings from '/engine/js/utils/settings.js';
import Selection from './utils/selection.js';
import ws from './utils/socket.js';
import UI from './ui/ui.js';

import MainScene from '/games/game-1/src/scenes/main-scene.js';
import Bunny from '/games/game-1/src/game-objects/bunny.js';

class Editor {

	constructor () {
		
		window.EDITOR = this;
		Object.defineProperty(PIXI.DisplayObject.prototype, '__editorData', {get:()=>{throw "No __editorData field found for " + this.constructor.name + '. To create game objects use code: Lib.create(\'name\')';}});

		this.currenGamePath = 'games/game-1';

		this.settings = new Settings('EDITOR');
		this.selection = new Selection();

		this.initResize();

		this.onUIMounted = this.onUIMounted.bind(this);
		this.onSelectedPropsChange = this.onSelectedPropsChange.bind(this);
		
		ReactDOM.render (
			React.createElement(UI, {onMounted:this.onUIMounted}),
			document.getElementById('root')
		);
	}

	onUIMounted(ui) {
		this.ui = ui;
		this.game = new Game('tmp.game.id');
		
		Lib.wrapConstructorProcessor(applyEditorDataToNode);
		
		Lib.addScene('main', MainScene);
		Lib.addObject('bunny', Bunny);
		Lib.addTexture('bunny', PIXI.Texture.fromImage('editor/img/pic1.png'));


		game.paused = true;
		game.init(document.getElementById('viewport-root'));
		applyEditorDataToNode(game.stage);
		
		this.loadScene();
	}

	loadScene() {
		game.showScene(Lib.loadScene('main'));
		this.selection.select(game.currentScene);
		this.refreshTreeViewAndPropertyEditor();
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

	/**
	* set propery value received frop property editor
	*/

	onSelectedPropsChange(field, val) {
		if(field.hasOwnProperty('set')) {
			var setter = field.set;
			for(let o of this.selection) {
				setter(o, val);
			}

		} else {
			for(let o of this.selection) {
				o[field.name] = val;
			}
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
				if(!cc.prototype) {
					throw 'attempt to enum editable properties of not PIXI.DisplayObject instance';
				}
				if(cc.hasOwnProperty('EDITOR_editableProps')) {  //check if property with same name already defined in super classes chain
					var addProps = cc.EDITOR_editableProps;
					if(addProps.some((p) => {
						return props.some((pp)=>{
							return pp.name === p.name
						});
					})) {
						throw 'redefenition of property "' + pp.name + '"';
					}

					props = addProps.concat(props);
				}
				if(cc === PIXI.DisplayObject) {
					break;
				}
				cc = cc.__proto__;
			}
			c.EDITOR_propslist_cache = props;
		}

		return c.EDITOR_propslist_cache;
	}
}


//====== extend DisplayObjct data for editor time only ===============================
var idCounter = 0;
var __editorDataPropertyDescriptor = {writable:true};
var applyEditorDataToNode = (n) => {
	Object.defineProperty(n, '__editorData', __editorDataPropertyDescriptor);
	n.__editorData = {id: idCounter++};
}

export default Editor;