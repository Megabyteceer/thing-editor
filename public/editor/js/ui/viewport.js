import Game from '/engine/js/game.js';

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
var selectionData;

class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.onTogglePlay = this.onTogglePlay.bind(this);
	}
	
	stopExecution(reason) {
		if (reason) {
			editor.ui.modal.showError(reason);
		}
		if (!game.__EDITORmode) {
			this.onTogglePlay();
		}
	}
	
	onTogglePlay() {
		var play = game.__EDITORmode;
		
		if (play) { // launch game
			editor.saveCurrentScene(editor.runningSceneLibSaveSlotName);
			selectionData = editor.selection.saveSelection();
		} else { //stop game
			editor.loadScene(editor.runningSceneLibSaveSlotName);
			editor.selection.loadSelection(selectionData);
		}
		game.__EDITORmode = !play;
		this.forceUpdate();
	}
	
	render() {
		return R.div({className: 'editor-viewport-wrapper'},
			
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport'
			}),
			
			R.div({className: 'editor-viewport-panel'},
				R.btn((!window.game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'play-stop-btn', 32),
				R.btn(R.icon('recompile'), editor.reloadClasses, 'Rebuild game sources', 'play-stop-btn'),
			)
		);
	}
	
}

export default Viewport;