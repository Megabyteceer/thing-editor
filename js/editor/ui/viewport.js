import PrefabsList from './prefabs-list.js';
import Lib from "thing-editor/js/engine/lib.js";
import LanguageSwitcher from "./language-switcher.js";
import game from "thing-editor/js/engine/game.js";
import Sound from 'thing-editor/js/engine/utils/sound.js';
import Keys from 'thing-editor/js/engine/utils/keys.js';
import ClassesView from './classes-view.js';
import Spine from 'thing-editor/js/engine/components/spine.js';
import SelectEditor from './props-editor/select-editor.js';
import {_stopTests} from 'thing-editor/js/engine/utils/autotest-utils.js';
import LanguageView from './language-view.js';
import Pool from "../../engine/utils/pool.js";
import fs from "../utils/fs.js";

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');

let prefabTitleProps = {className: 'prefabs-mode-title'};
let prefabLabelProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: window.copyTextByClick
};

const SPEED_SELECT = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32].map((value) => {
	return { value, name : '×' + value};
});

let stoppingExecutionTime;
let playTogglingTime;
let recoveryCheckingTime;
let problemOnGameStart,
	problemOnGameStop;

document.addEventListener('fullscreenchange', () => {
	game.onResize();
});

let currentResolution;
const resolutions = [
	{name: "Responsive", value: false},
	{name: "Project Fixed", value: true},
	{name: "Pixel 2 XL", value: {w:823, h:411}},
	{name: "iPhone 6/7/8", value: {w:667, h:375}},
	{name: "iPhone X", value: {w:812, h:375}},
	{name: "iPad", value: {w:1024, h:768}}
];

export default class Viewport extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.stopExecution = this.stopExecution.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
		this.onHelpersToggle = this.onHelpersToggle.bind(this);
		this.onDoubleClick = this.onDoubleClick.bind(this);
		this.onDragOver = this.onDragOver.bind(this);
		this.onDrop = this.onDrop.bind(this);
		this.onMobileToggle = this.onMobileToggle.bind(this);
		this.helpersHidden = false;
		game.isMobile.any = editor.settings.getItem('mobileMode', game.isMobile.any);
		let currentResolutionSettings = JSON.stringify(editor.settings.getItem('viewportMode', null));
		let currentItem = resolutions.find((i) => {
			return currentResolutionSettings === JSON.stringify(i.value);
		});
		if(currentItem) {
			this.setCurrentResolution(currentItem.value);
		}
	}

	setCurrentResolution(resolution) {
		currentResolution = resolution;
		game.__setFixedViewport(currentResolution);
	}

	onHelpersToggle() {
		this.helpersHidden = !this.helpersHidden;
		editor.overlay.hideHelpers(this.helpersHidden);
	}
	
	stopExecution() {
		if(!stoppingExecutionTime) {
			editor.exitPrefabMode();
			stoppingExecutionTime = true;
			if(!game.__EDITOR_mode) {
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
		game.onResize();
	}
	
	checkIfNeedRecovery() {
		if(!recoveryCheckingTime) {
			recoveryCheckingTime = true;
			setTimeout(() => {
				recoveryCheckingTime = false;
				if(problemOnGameStart || problemOnGameStop || editor.frameUpdateException) {
					
					playTogglingTime = false;
					
					if(problemOnGameStop) {
						problemOnGameStop = false;
						editor.ui.modal.showFatalError('Exception on game stopping.', 20001);
					}
					if(problemOnGameStart) {
						problemOnGameStart = false;
						editor.ui.modal.showFatalError('Exception on game starting.', 20002);
					}
					if(editor.frameUpdateException) {
						editor.frameUpdateException = false;
						editor.ui.modal.showFatalError('Exception on frame update.', 20003);
					}
				}
			}, 0);
			if(game.settings.getItem('__EDITOR_is-portrait-orientation')) {
				game.__enforcedOrientation = 'portrait';
			}
		}
	}
	
	onTogglePlay() {
		if(!playTogglingTime && !editor.__FatalError) {
			_stopTests();
			Keys.resetAll();
			this.checkIfNeedRecovery();
			playTogglingTime = true;
			
			this.resetZoom();
			game.__doOneStep = false;
			game.__paused = false;
			let play = game.__EDITOR_mode;
			game.__time = 0;
			delete game.__EDITOR_currentSceneData;
			Pool.__resetIdCounter();
			if(play) { // launch game
				game.data = {};
				editor.overlay.exitIsolation();
				editor.ui.status.clear();
				problemOnGameStart = true;
				editor.saveHistoryNow();
				editor.saveBackup(true);
				game.__EDITOR_selectionDataWaitingToSelect = editor.selection.saveSelection();
				game.__EDITOR_currentSceneData = Lib.__serializeObject(game.currentScene);
				game.__clearStage();
				Spine.clearPool();
				Sound.__resetSounds();
				game.__EDITOR_mode = false;
				game._setCurrentScene(null);
				game.showScene(editor.currentSceneName);
				problemOnGameStart = false;
				game.stage.interactiveChildren = true;
			} else { //stop game
				problemOnGameStop = true;
				game.__EDITOR_game_stopping = true;
				game.__clearStage();
				game.__EDITOR_mode = true;
				Sound.__resetSounds();
				editor.restoreBackup(true);
				game.__EDITOR_game_stopping = false;
				problemOnGameStop = false;
				game.stage.interactiveChildren = false;
			}
			
			this.forceUpdate();
			editor.history.updateUi();
			
			game.pixiApp.ticker._requestIfNeeded(); //restore broken ticker if necessary.
			
			playTogglingTime = false;
			game.onResize();
		}
	}

	scrollInToScreen(node) {
		let p = game.stage.parent.toLocal(node, node.parent);
		let W = game.W;
		let H = game.H;
		if(p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
			game.stage.toLocal(node, node.parent, p);
			game.stage.x = game.W / 2 - p.x * game.stage.scale.x;
			game.stage.y = game.H / 2 - p.y * game.stage.scale.y;
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
		editor.ui.status.clear();
		editor.reloadClasses();
	}
	
	onToggleOrientationClick() {
		game.__enforcedOrientation = (game.__enforcedOrientation === 'portrait') ? 'landscape' : 'portrait';
		game.settings.setItem('__EDITOR_is-portrait-orientation', (game.__enforcedOrientation === 'portrait'));
	}
	
	onReloadAssetsClick() {
		editor.ui.status.clear();
		editor.fs.refreshFiles().then(() => {
			editor.reloadAssets();
		});
	}

	jsFilesChanged() {
		this.setState({
			needReloadCode: true
		});
	}

	jsFilesReloaded() {
		this.setState({
			needReloadCode: false
		});
	}

	onBgColorChange(ev) {
		editor.overlay.setBGColor(parseInt(ev.target.value.replace('#', ''), 16));
	}

	onDoubleClick(ev) {
		if(ev.ctrlKey) {
			this.resetZoom();
		}
	}

	onDragOver(ev) {
		if (canBeDragAccepted(ev)) {
			ev.dataTransfer.effectAllowed = "copy";
			ev.dataTransfer.dropEffect = "copy";
			ev.preventDefault();
		}
	}

	onMobileToggle (ev) {
		game.isMobile.any = ev.target.checked;
		editor.settings.setItem('mobileMode', game.isMobile.any);
		this.resetZoom();
	}

	onDrop(ev) {
		let i = canBeDragAccepted(ev);
		if(i) {
			let b = ev.target.getBoundingClientRect();
			let scale = b.width / ev.target.width;
			let p = {
				x: (ev.clientX - b.left) / scale,
				y: (ev.clientY - b.top) / scale
			};

			i.getAsString((imageId) => {
				let o = ClassesView.loadSafeInstanceByClassName('DSprite');
				o.image = imageId;

				game.stage.toLocal(p, undefined, o);
				editor.addToScene(o);
				o.x = Math.round(o.x);
				o.y = Math.round(o.y);
			});
		}
		sp(ev);
		game.__loadDynamicTextures();
	}

	render() {
		
		let className = 'editor-viewport-wrapper';
		let statusHeader;
		let panel;
		
		let toggleOrientationBtn;
		if(editor.projectDesc && (editor.projectDesc.screenOrientation === 'auto')) {
			toggleOrientationBtn = R.btn(R.icon('orientation-toggle'), this.onToggleOrientationClick, 'Switch screen orientation (Ctrl + O)', 'big-btn', 1079);
		}

		let resolutionSelect;
		if(editor.projectDesc && editor.projectDesc.dynamicStageSize) {
			resolutionSelect = R.div({className: 'resolution-selector'},
				React.createElement(SelectEditor, {onChange: (ev) => {
					if(ev.target.value !== currentResolution) {
						this.setCurrentResolution(ev.target.value);
						editor.settings.setItem('viewportMode', currentResolution);
						this.forceUpdate();
					}
				}, noCopyValue:true, value: currentResolution, select: resolutions}),
				R.div({className: 'resolution'}, game.W + '×' + game.H)
			);
		}

		let reloadAssetsBtn = R.btn(R.icon('reload-assets'), this.onReloadAssetsClick, 'Reload game assets', 'big-btn');
		
		if(this.state.prefabMode) {
			className += ' editor-viewport-wrapper-prefab-mode';

			let fileLibraryName = fs.getFileLibName(Lib.__prefabNameToFileName(this.state.prefabMode));
			if(fileLibraryName) {
				className += ' editor-viewport-wrapper-prefab-mode-lib';
			}

			panel = R.span(null,
				R.div(prefabTitleProps, 'Prefab: ', R.br(), R.b(prefabLabelProps, this.state.prefabMode)),
				fileLibraryName ? R.libInfo(fileLibraryName, Lib.__prefabNameToFileName(this.state.prefabMode)).icon : undefined,
				R.btn(R.icon('accept'), () => {PrefabsList.acceptPrefabEdition(true);}, 'Accept prefab changes (Enter)', 'main-btn', 13),
				R.btn(R.icon('reject'), () => {
					if(editor.isCurrentContainerModified) {
						editor.ui.modal.showEditorQuestion("Are you sure?", "Are you really wanted to discard all changes made in prefab?", () => {PrefabsList.exitPrefabEdit(true);}, "Discard changes.");
					} else {
						PrefabsList.exitPrefabEdit(true);
					}
				}, 'Reject prefab changes (Esc)', undefined, 27),
				R.hr(),
				'BG color:',
				R.input({
					onChange: this.onBgColorChange,
					className: 'clickable',
					type: 'color',
					defaultValue: '#' + editor.overlay.getBGColor().toString(16).padStart(6, '0')
				}),
				R.hr(),
				reloadAssetsBtn,
				toggleOrientationBtn,
				resolutionSelect
			);
		} else {
			let pauseResumeBtn, oneStepBtn;
			if(game && !game.__EDITOR_mode) {
				pauseResumeBtn = R.btn(game.__paused ? PLAY_ICON : PAUSE_ICON, this.onPauseResumeClick, "Pause/Resume (Ctrl + P)", 'big-btn', 1080);
				if(game.__paused) {
					statusHeader = R.span({className: "red-blink"}, 'paused');
					oneStepBtn = R.btn('One step', this.onOneStepClick, "(Ctrl + [)", 'big-btn', 1219);
				} else {
					statusHeader = 'running';
				}
			}
			let needReloadCode = this.state.needReloadCode;

			panel = R.span(undefined,
				R.btn((!game || game.__EDITOR_mode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop (Ctrl + Space)', 'big-btn', 1032),
				R.hr(),
				R.btn(R.icon('recompile'), this.onReloadClassesClick, needReloadCode ? 'source code modified externally. Click here to load changes.' : 'Reload Custom Components', needReloadCode ? 'big-btn red-frame' : 'big-btn'),
				reloadAssetsBtn,
				R.hr(),
				statusHeader,
				pauseResumeBtn,
				oneStepBtn,
				(statusHeader) && R.hr(),
				toggleOrientationBtn,
				resolutionSelect,
				R.btn('⛶', () => {
					document.querySelector('#viewport-root').requestFullscreen();
				}, 'Go fullscreen', 'big-btn'),
				R.hr(),
				'Speed:',
				React.createElement(SelectEditor, {onChange:(ev) => {
					game.__speedMultiplier = ev.target.value;
					this.forceUpdate();
				}, noCopyValue:true, value: game.__speedMultiplier, select: SPEED_SELECT})
			);
		}
		
		let languagePanel = LanguageView.isOnlyOneLanguage ? undefined : React.createElement(LanguageSwitcher);
		
		return R.div({className},
			R.div({className: 'editor-viewport-panel'},

				R.btn("toggle helpers", () => {
					document.querySelector('#helpers-checkbox').click();
				}, undefined, "hidden", 1072),
				R.input({id:"helpers-checkbox", className:'clickable', type:'checkbox', title: "Hide helpers (Ctrl + H)", onChange: this.onHelpersToggle, defaultChecked:this.helpersHidden}),
				R.input({id:"is-mobile-checkbox", className:'clickable', type:'checkbox', title: "game.isMobile.any", onChange: this.onMobileToggle, defaultChecked:game.isMobile.any}),

				languagePanel,
				R.hr(),
				panel
			),
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport',
				onDoubleClick: this.onDoubleClick,
				onDragOver: this.onDragOver,
				onDrop: this.onDrop,
			})
		);
	}
}

function canBeDragAccepted(ev) {
	for(let i of ev.dataTransfer.items) {
		if(i.type ==="text/thing-editor-image-id") {
			return i;
		}
	}
}