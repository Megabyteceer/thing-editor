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
			EDITOR.ui.modal.showError(reason);
		}
		if (!game.__EDITORmode) {
			this.onTogglePlay();
		}
	}
	
	onTogglePlay() {
		var play = game.__EDITORmode;
		
		if (play) { // launch game
			EDITOR.saveCurrentScene(EDITOR.runningSceneLibSaveSlotName);
			selectionData = EDITOR.selection.saveSelection();
		} else { //stop game
			EDITOR.loadScene(EDITOR.runningSceneLibSaveSlotName);
			EDITOR.selection.loadSelection(selectionData);
		}
		this.forceUpdate();
		game.__EDITORmode = !play;
	}
	
	render() {
		return R.div({className: 'editor-viewport-wrapper'},
			
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport'
			}),
			
			R.div({className: 'editor-viewport-panel'},
				R.btn((!window.game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'play-stop-btn', 32),
				R.btn(R.icon('recompile'), EDITOR.reloadClasses, 'Rebuild game sources', 'play-stop-btn'),
			)
		);
	}
	
}

export default Viewport;