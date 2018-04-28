import Game from '/engine/js/game.js';

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');

class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onTogglePlay = this.onTogglePlay.bind(this);
	}
	
	stopExecution(reason) {
		if(reason) {
			EDITOR.ui.modal.showError(reason);
		}
		if(!game.__EDITORmode) {
			this.onTogglePlay();
		}
	}
	
	onTogglePlay() {
		var play = game.__EDITORmode;
		
		if (play) { // launch game
            EDITOR.saveCurrentScene(EDITOR.runningSceneLibSaveSlotName);
		} else { //stop game
            EDITOR.loadScene(EDITOR.runningSceneLibSaveSlotName);
		}
		this.forceUpdate();
        game.__EDITORmode = !play;
	}
	
	onMouseMove(ev) {
		if (ev.buttons === 2) {
			setSelectedPos(ev);
		}
	}
	
	onMouseDown(ev) {
		if (ev.buttons === 2) {
			setSelectedPos(ev);
		}
	}
	
	render() {
		return R.div({className: 'editor-viewport-wrapper'},
			
			R.div({
				id: 'viewport-root',
				onMouseDown: this.onMouseDown,
				onMouseMove: this.onMouseMove,
				className: 'editor-viewport'
			}),
			
			R.div({className: 'editor-viewport-panel'},
				R.btn((!window.game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'play-stop-btn', 32),
				R.btn(R.icon('recompile'), EDITOR.reloadClasses, 'Rebuild game sources', 'play-stop-btn'),
			)
		);
	}
	
}

function setSelectedPos(ev) {
	var p = Game.mouseEventToGlobalXY(ev);
	EDITOR.onSelectedPropsChange('x', Math.round(p.x));
	EDITOR.onSelectedPropsChange('y', Math.round(p.y));
}

export default Viewport;