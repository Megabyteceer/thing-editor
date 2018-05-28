import PrefabsList from './prefabs-list.js';
import Lib from "../../../engine/js/lib.js";
import Signal from "../utils/signal.js";

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');
var selectionData;
var prefabTitleProps = {className:'prefabs-mode-title'};
var prefabLabelProps = {className: 'selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};

var stoppingExecutionTime;
var playTogglingTime;

var savedBackupName;

export default class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
		this.beforePlayStopToggle = new Signal();
	}
	
	stopExecution() {
		playTogglingTime = false;
		if(!stoppingExecutionTime) {
			stoppingExecutionTime = true;
			if (!game.__EDITORmode) {
				this.onTogglePlay();
			}
			stoppingExecutionTime = false;
		}
	}
	
	onTogglePlay() {
		if(!playTogglingTime) {
			playTogglingTime = true;
			
			game.__doOneStep = false;
			game.__paused = false;
			var play = game.__EDITORmode;
			this.beforePlayStopToggle.emit(play);
			Lib.__clearStaticScenes();
			if (play) { // launch game
				editor.tryToSaveHistory();

				savedBackupName = editor.runningSceneLibSaveSlotName;
				if(!editor.isCurrentSceneModified) {
					savedBackupName += '-unmodified';
				}
				editor.saveCurrentScene(savedBackupName);
				selectionData = editor.selection.saveSelection();
				game.__EDITORmode = false;
				Lib.__constructRecursive(game.currentScene);
				game._processOnShow();
			} else { //stop game
				game.__cleanupBeforeToggleStop();
				game.currentScene.remove();
				game.currentScene = null;
				game.__EDITORmode = true;
				editor.loadScene(savedBackupName);
				editor.selection.loadSelection(selectionData);
			}
			
			this.forceUpdate();
			editor.history.updateUi();
			
			game.pixiApp.ticker._requestIfNeeded(); //restore broken ticker if necessary.
			
			playTogglingTime = false;
		}
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
	
    onReloadClassesClick() {
		editor.fs.refreshFiles().then(editor.reloadClasses);
    }
	
	onReloadAssetsClick() {
		editor.fs.refreshFiles().then(editor.reloadAssets);
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
                R.btn(R.icon('recompile'), this.onReloadClassesClick, 'Rebuild game sources', 'big-btn'),
                R.btn(R.icon('reload-assets'), this.onReloadAssetsClick, 'Reload game assets', 'big-btn'),
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