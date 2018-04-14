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

	onSelectedPropsChange(fieldName, val) {
		for(let o of this.selection) {
			o[fieldName] = val;
		}
		this.refreshTreeViewAndPropertyEditor();
	}
}

var idCounter = 0;
var __editorDataPropertyDescriptor = {writable:true};
var applyEditorDataToNode = (n) => {
	Object.defineProperty(n, '__editorData', __editorDataPropertyDescriptor);
	n.__editorData = {id: idCounter++};
}

export default Editor;