import type { Container, Point } from 'pixi.js';
import type { ClassAttributes, ComponentChild } from 'preact';
import { h } from 'preact';
import ClassesLoader from 'thing-editor/src/editor/classes-loader';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import 'thing-editor/src/editor/ui/editor-overlay';
import { exitIsolation } from 'thing-editor/src/editor/ui/isolation';

import SelectEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import type { FixedViewportSize } from 'thing-editor/src/engine/game';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import MusicFragment from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment';
import Keys from 'thing-editor/src/engine/utils/keys';
import Pool from 'thing-editor/src/engine/utils/pool';
import Sound from 'thing-editor/src/engine/utils/sound';
import DataAccessDebugger from '../utils/data-access-debugger';

const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');
const PAUSE_ICON = R.icon('pause');

let playTogglingTime = false;

let prefabTitleProps = { className: 'prefabs-mode-title' };
let prefabLabelProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: copyTextByClick
};

const ORIENTATION_ICON = R.icon('orientation-toggle');

const SPEED_SELECT = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32].map((value) => {
	return { value, name: '×' + value };
});

const onBgColorChange = (ev: InputEvent) => {
	PrefabEditor.BGColor = parseInt((ev.target as HTMLInputElement).value.replace('#', ''), 16);
};

interface ViewportStats {
	prefabMode: string | null;
}

document.addEventListener('fullscreenchange', () => {
	game.onResize();
});

interface ViewportSizeItem {
	name: string;
	value: FixedViewportSize;
}

const resolutions: ViewportSizeItem[] = [
	{ name: 'Responsive', value: false },
	{ name: 'Fixed', value: true },
	{ name: 'Pixel 2 XL', value: { w: 823, h: 411 } },
	{ name: 'iPhone 8', value: { w: 667, h: 375 } },
	{ name: 'iPhone X', value: { w: 812, h: 375 } },
	{ name: 'iPad', value: { w: 1024, h: 768 } }
];

export default class Viewport extends ComponentDebounced<ClassAttributes<Viewport>, ViewportStats> {

	viewportScale = 1;

	constructor(props: ClassAttributes<Viewport>) {
		super(props);
		this.onTogglePlay = this.onTogglePlay.bind(this);
		this.onPauseResumeClick = this.onPauseResumeClick.bind(this);
		this.onDoubleClick = this.onDoubleClick.bind(this);
		this.stopExecution = this.stopExecution.bind(this);
		this.onOneStepClick = this.onOneStepClick.bind(this);
		this.showResolutionSelectMenu = this.showResolutionSelectMenu.bind(this);
		editorEvents.once('projectDidOpen', () => {
			this.restoreResolution();

		});
	}

	restoreResolution() {
		let currentResolutionSettings = JSON.stringify(game.editor.settings.getItem('viewportMode', null));
		let currentItem = resolutions.find((i) => {
			return currentResolutionSettings === JSON.stringify(i.value);
		});
		if (currentItem) {
			this.setCurrentResolution(currentItem);
		}
	}

	showResolutionSelectMenu(ev: PointerEvent) {
		showContextMenu(
			resolutions.map((resolutionItem) => {
				return {
					name: R.span({ className: (resolutionItem === this.currentResolution) ? 'current-menu-item' : undefined },
						resolutionItem.name, ((typeof resolutionItem.value === 'boolean') ? undefined : R.span({ className: 'resolution' }, ' (' + resolutionItem.value.w + ' х ' + resolutionItem.value.h + ')'))),
					onClick: () => {
						game.editor.settings.setItem('viewportMode', resolutionItem.value);
						this.setCurrentResolution(resolutionItem);
					}
				};
			}), ev);
	}

	onTogglePlay() {
		if (!playTogglingTime && !game.editor.__FatalError) {

			Keys.resetAll();

			playTogglingTime = true;

			this.resetZoom();
			game.__doOneStep = false;
			game.__paused = false;
			let play = game.__EDITOR_mode;
			game.__time = 0;
			PrefabEditor.acceptPrefabEdition();
			Sound.__resetSounds();
			Pool.__resetIdCounter();
			if (play) { // launch game
				DataAccessDebugger.initializeGameData();
				(game.data as SelectableProperty).___EDITOR_isGoodForChooser = true;
				(game.data as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

				exitIsolation();
				game.editor.ui.status.clear();
				game.editor.saveBackup();
				game.editor.selection.saveCurrentSelection();
				game.__clearStage();

				game.__EDITOR_mode = false;
				game._setCurrentScene(null);
				const backupName = game.editor.currentSceneBackupName;

				game.showScene(Lib.hasScene(backupName) ? backupName : game.editor.currentSceneName);
				game.stage.interactiveChildren = true;
			} else { //stop game
				EDITOR_FLAGS.isStoppingTime = true;
				game.__EDITOR_mode = true;
				game.__clearStage();
				game.editor.restoreBackup();
				EDITOR_FLAGS.isStoppingTime = false;
				game.stage.interactiveChildren = false;
			}

			this.forceUpdate();

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
		if (!game.__EDITOR_mode) {
			this.onTogglePlay();
		}
	}

	onDoubleClick(ev: PointerEvent) {
		if (ev.ctrlKey) {
			this.resetZoom();
		}
	}

	resetZoom() {
		game.stage.scale.x = 1;
		game.stage.scale.y = 1;
		if (PrefabEditor.currentPrefabName) {
			game.stage.x = game.W / 2;
			game.stage.y = game.H / 2;
		} else {
			game.stage.x = 0;
			game.stage.y = 0;
		}
	}

	currentResolution = resolutions[0];

	setCurrentResolution(resolution: ViewportSizeItem) {
		if (!game.projectDesc.dynamicStageSize) {
			return;
		}
		this.currentResolution = resolution;
		game.__setFixedViewport(resolution.value);
	}

	scrollInToScreen(node: Container) {
		let b = node.getBounds();
		if (b.width === 0 && b.height === 0) {
			node.getGlobalPosition(b as any as Point);
		}

		if (b.left < 0) {
			game.stage.x -= b.left;
		} else if (b.right > game.W) {
			game.stage.x -= b.right - game.W;
		}

		if (b.top < 0) {
			game.stage.y -= b.top;
		} else if (b.bottom > game.H) {
			game.stage.y -= b.bottom - game.H;
		}
	}

	render(): ComponentChild {
		let className = 'editor-viewport-wrapper';

		let panel: ComponentChild;
		let statusHeader: ComponentChild;

		let resolutionSelect;
		if (game.editor.projectDesc) {
			resolutionSelect = game.projectDesc.dynamicStageSize ?
				R.fragment(
					R.div({
						className: 'resolution clickable',
						onMouseDown: this.showResolutionSelectMenu
					},
					R.div(null, this.currentResolution.name),
					R.div(null, game.W + '×' + game.H),
					),
					R.hr()
				) :
				R.fragment(
					R.div(null, game.W + '×' + game.H),
					R.hr()
				);
		}

		const reloadClassesBtn = R.btn(R.icon('recompile'), game.editor.reloadClasses, ClassesLoader.isClassesWaitsReloading ? 'Source code modified externally. Click to load changes.' : 'Reload classes', ClassesLoader.isClassesWaitsReloading ? 'big-btn red-frame' : 'big-btn');
		const orientationButton = (game.editor.projectDesc && game.editor.projectDesc.screenOrientation === 'auto') ? R.btn(ORIENTATION_ICON, game.editor.toggleScreenOrientation, 'Portrait/Landscape switch', undefined, { key: 'r', ctrlKey: true }) : undefined;
		let prefabFile = this.state.prefabMode && fs.getFileByAssetName(this.state.prefabMode, AssetType.PREFAB);
		if (!prefabFile && this.state.prefabMode) {
			PrefabEditor.exitPrefabEdit(true); // prefab removed
		}
		if (prefabFile) {
			className += ' editor-viewport-wrapper-prefab-mode';


			let fileLibraryName = prefabFile.lib;
			if (fileLibraryName) {
				className += ' editor-viewport-wrapper-prefab-mode-lib';
			}

			panel = R.span(panelWrapperProps,
				R.span(panelProps,
					reloadClassesBtn,
					R.hr(),
					R.div(prefabTitleProps, 'Prefab: ', R.br(), R.b(prefabLabelProps, this.state.prefabMode)),
					R.hr(),
					fileLibraryName ? libInfo(prefabFile) : undefined,
					R.btn(R.icon('accept'), () => { PrefabEditor.acceptPrefabEdition(true); }, 'Accept prefab changes', 'main-btn', { key: 'Enter' }),
					R.btn(R.icon('reject'), () => {
						if (game.editor.isCurrentContainerModified) {
							game.editor.ui.modal.showEditorQuestion(
								'Are you sure?',
								'Are you really wanted to discard all changes made in prefab?',
								() => { PrefabEditor.exitPrefabEdit(true); },
								'Discard changes.'
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
						title: 'Background color'
					}),
				),
				R.span(panelBottomProps,
					orientationButton,
					R.hr(),
					resolutionSelect
				)
			);
		} else {
			let pauseResumeBtn, oneStepBtn;
			if (game && !game.__EDITOR_mode) {
				pauseResumeBtn = R.btn(game.__paused ? PLAY_ICON : PAUSE_ICON, this.onPauseResumeClick, 'Pause/Resume', 'big-btn', { key: 'p', ctrlKey: true });
				if (game.__paused) {
					statusHeader = R.div({ className: 'red-blink' }, 'paused');
					oneStepBtn = R.btn('One step', this.onOneStepClick, undefined, 'big-btn', { key: 'BracketLeft', ctrlKey: true });
				} else {
					statusHeader = R.div(null, 'running');
				}
			}

			panel = R.span(panelWrapperProps,
				R.span(panelProps,
					reloadClassesBtn,
					R.hr(),
					R.btn((!game || game.__EDITOR_mode) ? PLAY_ICON : STOP_ICON, this.onTogglePlay, 'Play/Stop', 'big-btn', { key: 'Space', ctrlKey: true }),
					R.br(),
					statusHeader,
					pauseResumeBtn,
					oneStepBtn,
					(statusHeader) && R.hr()

				),
				R.span(panelBottomProps,
					orientationButton,
					R.hr(),
					resolutionSelect,
					R.btn('⛶', () => {
						if (document.fullscreenElement) {
							document.exitFullscreen();
						} else {
							(document.querySelector('#viewport-root') as HTMLElement).requestFullscreen().then(() => {
								game.onResize();
							});
						}
					}, 'Go fullscreen', 'big-btn', { key: 'ENTER', altKey: true }),
					R.hr(),
					'Speed:',
					h(SelectEditor, {
						onChange: (val) => {
							game.pixiApp.ticker.speed = val;
							MusicFragment.__applyGameSpeed(val);
							this.forceUpdate();
						},
						noCopyValue: true,
						value: game.pixiApp ? game.pixiApp.ticker.speed : 1,
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
				onDblClick: this.onDoubleClick
			})
		);
	}
}

const panelWrapperProps = {
	className: 'viewport-panel-wrapper'
};

const panelProps = {
	className: 'viewport-panel'
};

const panelBottomProps = {
	className: 'viewport-panel viewport-bottom-panel'
};
