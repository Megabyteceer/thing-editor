import Game from '/js/engine/game.js';
import Settings from '/js/engine/utils/settings.js';
import ws from './utils/socket.js';
import UI from './ui/ui.js';

import MainScene from '/games/game-1/src/game-objects/scenes/main-scene.js';

class Editor {

	constructor () {
		
		window.EDITOR = this;

		this.currenGamePath = 'games/game-1';

		this.settings = new Settings('EDITOR');

		this.initResize();

		this.onUIMounted = this.onUIMounted.bind(this);
		

		ReactDOM.render (
			React.createElement(UI, {onMounted:this.onUIMounted}),
			document.getElementById('root')
		);
	}

	onUIMounted(ui) {
		this.ui = ui;
		window.game = new Game('tmp.game.id');
		game.paused = true;
		game.init(document.getElementById('viewport-root'));
		
		this.loadScene();
	}

	loadScene() {

		game.showScene(new MainScene());
	}

	initResize() {
		var onResize = () => {
			this.W = window.innerWidth;
			this.H = window.innerHeight;
		}
		
		$(window).on('resize', onResize);
		onResize();
	}
}

export default Editor;