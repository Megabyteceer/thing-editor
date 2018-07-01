import PrefabsList from './prefabs-list.js';
import Lib from "/thing-engine/js/lib.js";
import Signal from "../utils/signal.js";
import LanguageSwitcher from "./language-switcher.js";
import game from "/thing-engine/js/game.js";
import Sound from '/thing-engine/js/utils/sound.js';

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');

let prefabTitleProps = {className: 'prefabs-mode-title'};
let prefabLabelProps = {
	className: 'selectable-text', onMouseDown: function(ev) {
		selectText(ev.target);
		sp(ev);
	}
};

let stoppingExecutionTime;
let playTogglingTime;
let recoveryCheckingTime;
let problemOnGameStart,
	problemOnGameStop;

export default class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.stopExecution = this.stopExecution.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
		this.beforePlayStopToggle = new Signal();
	}
	
	stopExecution() {
		if(!stoppingExecutionTime) {
			stoppingExecutionTime = true;
			if(!game.__EDITORmode) {
				this.onTogglePlay();
			}
			stoppingExecutionTime = false;
		}
	}

	
	resetZoom() {
		game.stage.scale.x = 1;
		game.stage.scale.y = 1;
		game.stage.x = 0;
		game.stage.y = 0;
	}
	
	checkIfNeedRecovery() {
		if(!recoveryCheckingTime) {
			setTimeout(() => {
				if(problemOnGameStart || problemOnGameStop || editor.frameUpdateException) {
					
					playTogglingTime = false;
					
					if(problemOnGameStop) {
						problemOnGameStop = false;
						editor.ui.modal.showFatalError('Exception on game stopping.');
					}
					if(problemOnGameStart) {
						problemOnGameStart = false;
						editor.ui.modal.showFatalError('Exception on game starting.');
					}
					if(editor.frameUpdateException) {
						editor.frameUpdateException = false;
						editor.ui.modal.showFatalError('Exception on frame update.');
					}
					game.__EDITORmode = true;
					recoveryCheckingTime = false;
				}
			}, 0);
		}
	}
	
	onTogglePlay() {
		if(!playTogglingTime) {
			this.checkIfNeedRecovery();
			playTogglingTime = true;
			
			Sound.__resetSounds();
			this.resetZoom();
			game.__doOneStep = false;
			game.__paused = false;
			let play = game.__EDITORmode;
			this.beforePlayStopToggle.emit(play);
			Lib.__clearStaticScenes();
			if(play) { // launch game
				editor.ui.status.clear();
				problemOnGameStart = true;
				editor.tryToSaveHistory();
				
				editor.saveBackup(true);
				
				let sceneData = Lib.__serializeObject(game.currentScene);
				game.__clearStage();
				game.__EDITORmode = false;
				let s = Lib._loadObjectFromData(sceneData);
				game.currentScene = null;
				game.showScene(s);
				problemOnGameStart = false;
			} else { //stop game
				
				problemOnGameStop = true;
				game.__clearStage();
				game.__EDITORmode = true;
				editor.restoreBackup(true);
				
				problemOnGameStop = false;
			}
			
			this.forceUpdate();
			editor.history.updateUi();
			
			game.pixiApp.ticker._requestIfNeeded(); //restore broken ticker if necessary.
			
			playTogglingTime = false;
			game.onResize();
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
		this.setState({prefabMode: enabled});
	}
	
	onReloadClassesClick() {
		editor.fs.refreshFiles().then(editor.reloadClasses);
	}
	
	onToggleOrientationClick() {
		game.enforcedOrientation = (game.enforcedOrientation === 'portrait') ? 'landscape' : 'portrait';
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	onReloadAssetsClick() {
		editor.fs.refreshFiles().then(editor.reloadAssets);
	}
	
	render() {
		
		let className = 'editor-viewport-wrapper';
		let statusHeader;
		let panel;
		
		let toggleOrientationBtn;
		if(game && (game.screenOrientation === 'auto')) {
			toggleOrientationBtn = R.btn(R.icon('orientation-toggle'), this.onToggleOrientationClick, 'Switch screen orientation (Ctrl + O)', 'big-btn', 1079);
		}
		
		if(this.state.prefabMode) {
			className += ' editor-viewport-wrapper-prefab-mode';
			panel = R.span(null,
				R.div(prefabTitleProps, 'Prefab: ', R.br(), R.b(prefabLabelProps, this.state.prefabMode)),
				R.btn(R.icon('accept'), PrefabsList.acceptPrefabEdition, 'Accept prefab changes', 'main-btn'),
				R.btn(R.icon('reject'), PrefabsList.hidePrefabPreview, 'Reject prefab changes'),
				'BG color:',
				R.input({
					onChange: (ev) => {
						editor.overlay.setBGcolor(parseInt(ev.target.value.replace('#', ''), 16));
					},
					className: 'clickable',
					type: 'color',
					defaultValue: '#' + editor.overlay.getBGcolor().toString(16).padStart(6, '0')
				}),
				toggleOrientationBtn
			);
		} else {
			let pauseResumeBtn, oneStepBtn;
			if(game && !game.__EDITORmode) {
				pauseResumeBtn = R.btn(game.__paused ? PLAY_ICON : PAUSE_ICON, this.onPauseResumeClick, undefined, 'big-btn');
				if(game.__paused) {
					statusHeader = 'paused';
					oneStepBtn = R.btn('One step', this.onOneStepClick);
				} else {
					statusHeader = 'running';
				}
			}
			panel = R.span(undefined,
				R.btn((!game || game.__EDITORmode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Ctrl + Space)', 'big-btn', 1032),
				R.btn(R.icon('recompile'), this.onReloadClassesClick, 'Rebuild game sources', 'big-btn'),
				R.btn(R.icon('reload-assets'), this.onReloadAssetsClick, 'Reload game assets', 'big-btn'),
				statusHeader,
				pauseResumeBtn,
				oneStepBtn,
				toggleOrientationBtn
			);
		}
		
		let languagePanel = React.createElement(LanguageSwitcher);
		
		return R.div({className},
			R.div({className: 'editor-viewport-panel'},
				languagePanel,
				panel
			),
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport'
			})
		);
	}
}