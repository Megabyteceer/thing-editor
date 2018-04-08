import Game from '/engine/js/game.js';
import Settings from '/engine/js/utils/settings.js';
import Selection from './utils/selection.js';
import ws from './utils/socket.js';
import UI from './ui/ui.js';

import MainScene from '/games/game-1/src/game-objects/scenes/main-scene.js';
import Bunny from '/games/game-1/src/game-objects/bunny.js';

class Editor {

	constructor () {
		
		window.EDITOR = this;

		this.currenGamePath = 'games/game-1';

		this.settings = new Settings('EDITOR');
		this.selection = new Selection();

		this.initResize();

		this.onUIMounted = this.onUIMounted.bind(this);
		
		ReactDOM.render (
			React.createElement(UI, {onMounted:this.onUIMounted}),
			document.getElementById('root')
		);
	}

	onUIMounted(ui) {
		var idCounter = 0;

		this.ui = ui;
		this.game = new Game('tmp.game.id');
		
		Lib.wrapConstructorProcessor((o) => {
			o.__editorData = {id: idCounter++};
		});
		Lib.addScene('main', MainScene);
		Lib.addObject('bunny', Bunny);
		Lib.addTexture('bunny', PIXI.Texture.fromImage('editor/img/pic1.png'));


		game.paused = true;
		game.init(document.getElementById('viewport-root'));
		
		this.loadScene();
	}

	loadScene() {
		game.showScene(Lib.loadScene('main'));
		this.refreshSceneTree();
	}

	refreshSceneTree() {
		this.ui.sceneTree.forceUpdate();
	}

	initResize() {
		var onResize = () => {
			this.W = window.innerWidth;
			this.H = window.innerHeight;
		}
		
		$(window).on('resize', onResize);
		onResize();
	}

	refreshTreeView() {
		this.ui.sceneTree.forceUpdate();
	}
}

export default Editor;