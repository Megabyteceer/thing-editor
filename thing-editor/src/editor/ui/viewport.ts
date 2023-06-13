import { ClassAttributes, ComponentChild, h } from "preact";
import ClassesLoader from "thing-editor/src/editor/classes-loader";
import fs, { AssetType } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import "thing-editor/src/editor/ui/editor-overlay";
import { exitIsolation } from "thing-editor/src/editor/ui/isolation";

import SelectEditor from "thing-editor/src/editor/ui/props-editor/props-editors/select-editor";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import Keys from "thing-editor/src/engine/utils/keys";
import Pool from "thing-editor/src/engine/utils/pool";

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');

let playTogglingTime = false;;

let prefabTitleProps = { className: 'prefabs-mode-title' };
let prefabLabelProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: copyTextByClick
};

const SPEED_SELECT = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32].map((value) => {
	return { value, name: '×' + value };
});

const onBgColorChange = (ev: InputEvent) => {
	PrefabEditor.BGColor = parseInt((ev.target as HTMLInputElement).value.replace('#', ''), 16);
}

interface ViewportProps extends ClassAttributes<Viewport> {

}

interface ViewportStats {
	prefabMode: string | null;
}

document.addEventListener('fullscreenchange', () => {
	game.onResize();
});

export default class Viewport extends ComponentDebounced<ViewportProps, ViewportStats> {

	constructor(props: ViewportProps) {
		super(props);
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.stopExecution = this.stopExecution.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
	}

	onTogglePlay() {
		if(!playTogglingTime && !game.editor.__FatalError) {
			// TODO _stopTests();
			Keys.resetAll();

			playTogglingTime = true;

			this.resetZoom();
			game.__doOneStep = false;
			game.__paused = false;
			let play = game.__EDITOR_mode;
			game.__time = 0;
			PrefabEditor.acceptPrefabEdition();

			Pool.__resetIdCounter();
			if(play) { // launch game
				game.data = {};
				exitIsolation();
				game.editor.ui.status.clear();
				game.editor.saveBackup();
				game.editor.selection.saveCurrentSelection();
				game.__clearStage();
				// TODO Spine.clearPool();
				//TODO Sound.__resetSounds();
				game.__EDITOR_mode = false;
				game._setCurrentScene(null);
				const backupName = game.editor.currentSceneBackupName;

				game.showScene(Lib.hasScene(backupName) ? backupName : game.editor.currentSceneName);
				game.stage.interactiveChildren = true;
			} else { //stop game
				game.__clearStage();
				game.__EDITOR_mode = true;
				// TODO Sound.__resetSounds();
				game.editor.restoreBackup();

				game.stage.interactiveChildren = false;
			}

			this.forceUpdate();
			game.editor.history.updateUi();

			//TODO возможно что и так все ок будет. game.pixiApp.ticker._requestIfNeeded(); //restore broken ticker if necessary.

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

	setPrefabMode(enabled: string | null = null) {
		this.setState({ prefabMode: enabled });
	}

	stopExecution() {
		PrefabEditor.acceptPrefabEdition();
		if(!game.__EDITOR_mode) {
			this.onTogglePlay();
		}
	}

	onDoubleClick(ev: PointerEvent) {
		if(ev.ctrlKey) {
			this.resetZoom();
		}
	}

	onDragOver() {
		//TODO:
	}

	onDrop() {
		//TODO:
	}

	resetZoom() {
		game.stage.scale.x = 1;
		game.stage.scale.y = 1;
		game.stage.x = 0;
		game.stage.y = 0;
	}

	render(): ComponentChild {
		let className = 'editor-viewport-wrapper';

		let panel: ComponentChild;
		let statusHeader: ComponentChild;

		let resolutionSelect;
		if(game.editor.projectDesc && game.editor.projectDesc.dynamicStageSize) {
			resolutionSelect = R.div({ className: 'resolution' }, game.W + '×' + game.H)
		}

		const reloadClassesBtn = R.btn(R.icon('recompile'), game.editor.reloadClasses, ClassesLoader.isClassesWaitsReloading ? 'Source code modified externally. Click to load changes.' : 'Reload classes', ClassesLoader.isClassesWaitsReloading ? 'big-btn red-frame' : 'big-btn');

		if(this.state.prefabMode) {
			className += ' editor-viewport-wrapper-prefab-mode';

			let prefabFile = fs.getFileByAssetName(this.state.prefabMode, AssetType.PREFAB);
			let fileLibraryName = prefabFile.lib;
			if(fileLibraryName) {
				className += ' editor-viewport-wrapper-prefab-mode-lib';
			}

			panel = R.span(panelWrapperProps,
				R.span(panelProps,
					reloadClassesBtn,
					R.hr(),
					R.div(prefabTitleProps, 'Prefab: ', R.br(), R.b(prefabLabelProps, this.state.prefabMode)),
					R.hr(),
					//TODO fileLibraryName ? R.libInfo(fileLibraryName, prefabFile.fileName).icon : undefined,
					R.btn(R.icon('accept'), () => { PrefabEditor.acceptPrefabEdition(true); }, 'Accept prefab changes', 'main-btn', { key: 'Enter' }),
					R.btn(R.icon('reject'), () => {
						if(game.editor.isCurrentContainerModified) {
							game.editor.ui.modal.showEditorQuestion(
								"Are you sure?",
								"Are you really wanted to discard all changes made in prefab?",
								() => { PrefabEditor.exitPrefabEdit(true); },
								"Discard changes."
							);
						} else {
							PrefabEditor.exitPrefabEdit(true);
						}
					}, 'Reject prefab changes', undefined, { key: 'Escape' }),
					R.hr(),
					R.input({
						onInput: onBgColorChange,
						className: 'clickable',
						type: 'color',
						value: '#' + PrefabEditor.BGColor.toString(16).padStart(6, '0'),
						title: "Background color"
					}),
				),
				R.span(panelBottomProps,
					resolutionSelect
				)
			);
		} else {
			let pauseResumeBtn, oneStepBtn;
			if(game && !game.__EDITOR_mode) {
				pauseResumeBtn = R.btn(game.__paused ? PLAY_ICON : PAUSE_ICON, this.onPauseResumeClick, "Pause/Resume", 'big-btn', { key: 'p', ctrlKey: true });
				if(game.__paused) {
					statusHeader = R.div({ className: "red-blink" }, 'paused');
					oneStepBtn = R.btn('One step', this.onOneStepClick, undefined, 'big-btn', { key: '[', ctrlKey: true });
				} else {
					statusHeader = R.div(null, 'running');
				}
			}

			panel = R.span(panelWrapperProps,
				R.span(panelProps,
					reloadClassesBtn,
					R.hr(),
					R.btn((!game || game.__EDITOR_mode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop', 'big-btn', { key: ' ', ctrlKey: true }),
					R.br(),
					statusHeader,
					pauseResumeBtn,
					oneStepBtn,
					(statusHeader) && R.hr()

				),
				R.span(panelBottomProps,
					resolutionSelect,
					R.btn('⛶', () => {
						(document.querySelector('#viewport-root') as HTMLElement).requestFullscreen();
					}, 'Go fullscreen', 'big-btn'),
					R.hr(),
					'Speed:',
					h(SelectEditor, {
						onChange: (val) => {
							game.__speedMultiplier = val;
							this.forceUpdate();
						},
						noCopyValue: true,
						value: game.__speedMultiplier,
						select: SPEED_SELECT
					}),
					R.hr()
				)
			);
		}


		return R.div({ className },
			panel,
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport',
				onDoubleClick: this.onDoubleClick,
				onDragOver: this.onDragOver,
				onDrop: this.onDrop,
			})
		)
	}
}

const panelWrapperProps = {
	className: "viewport-panel-wrapper"
}

const panelProps = {
	className: "viewport-panel"
}

const panelBottomProps = {
	className: "viewport-panel viewport-bottom-panel"
}