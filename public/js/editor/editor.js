import game from '/js/engine/game.js';
import engineUtils from '/js/editor/utils/editor-utils.js';
import Settings from '/js/engine/utils/settings.js';
import ws from '/js/editor/utils/socket.js';
import UI from '/js/editor/ui/ui.js';

class Editor {

	constructor () {
		
		window.EDITOR = this;
		this.settings = new Settings('EDITOR');

		this.initResize();

		this.onUIMounted = this.onUIMounted.bind(this);

		ReactDOM.render(
			React.createElement(UI, {onMounted:this.onUIMounted }),
			document.getElementById('root')
		);
	}

	onUIMounted(ui) {
		this.ui = ui;

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