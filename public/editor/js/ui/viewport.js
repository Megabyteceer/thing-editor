import PrefabsList from './prefabs-list.js';
import Lib from "../../../engine/js/lib.js";

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');
var selectionData;
var prefabTitleProps = {className:'prefabs-mode-title'};
var prefabLabelProps = {className: 'selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};

export default class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
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
		game.__doOneStep = false;
		game.__paused = false;
		var play = game.__EDITORmode;
		Lib.__clearStaticScenes();
		if (play) { // launch game
			editor.saveCurrentScene(editor.runningSceneLibSaveSlotName);
			selectionData = editor.selection.saveSelection();
			game.__EDITORmode = false;
			Lib.__constructRecursive(game.currentScene);
		} else { //stop game
			while (game.modalsCount > 0) {
				game.closeModal();
			}
			var scenesStack = game.__getScenesStack();
			while (scenesStack.length > 0) {
				var s = scenesStack.pop();
				game.stage.addChild(s);
				s.remove();
			}
			
			game.currentScene.remove();
			game.currentScene = null;
			game.__EDITORmode = true;
			editor.loadScene(editor.runningSceneLibSaveSlotName);
			editor.selection.loadSelection(selectionData);
		}
		
		this.forceUpdate();
		editor.history.updateUi();
		
		game.pixiApp.ticker._requestIfNeeded(); //restore broken ticker if necessary.
	}
	
	onPauseResumeClick() {
		game.__paused = !game.__paused;
		this.forceUpdate();
	}
	
	onOneStepClick() {
		game.__doOneStep = true;
		this.forceUpdate();
	}

    setPrefabMode(enabled) {
	    this.setState({prefabMode:enabled});
    }
	
	render() {

        var className = 'editor-viewport-wrapper';
		var statusHeader;
        var panel;
	    if(this.state.prefabMode) {
		    className += ' editor-viewport-wrapper-prefab-mode';
            panel = R.span( null,
                R.div(prefabTitleProps, 'Prefab edition mode: ', R.br(), R.br(), R.b(prefabLabelProps, this.state.prefabMode)),
	            R.btn(R.icon('accept'), PrefabsList.acceptPrefabEdition, 'Accept prefab changes', 'main-btn'),
                R.btn(R.icon('reject'), PrefabsList.hidePrefabPreview, 'Reject prefab changes')
            )
        } else {
	    	var pauseResumeBtn, oneStepBtn;
	    	if(window.game && !game.__EDITORmode) {
			    pauseResumeBtn = R.btn(game.__paused ? PLAY_ICON : PAUSE_ICON, this.onPauseResumeClick, undefined, 'big-btn');
			    if(game.__paused) {
				    statusHeader = 'paused';
			    	oneStepBtn = R.btn('One step', this.onOneStepClick);
			    } else {
				    statusHeader = 'running';
			    }
		    }
	    	
	        panel = R.span( undefined,
	            R.btn((!window.game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'big-btn', 1032),
                R.btn(R.icon('recompile'), editor.reloadClasses, 'Rebuild game sources', 'big-btn'),
		        statusHeader,
		        pauseResumeBtn,
		        oneStepBtn
            )
        }


		return R.div({className},
			R.div({className: 'editor-viewport-panel'},
				panel
			),
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport'
			})
		);
	}
}
