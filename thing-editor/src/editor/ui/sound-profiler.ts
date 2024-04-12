import type { ClassAttributes, ComponentChild } from 'preact';
import { h } from 'preact';

import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import Window from 'thing-editor/src/editor/ui/editor-window';
import MainMenu from 'thing-editor/src/editor/ui/main-menu';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import type { DebugStack } from 'thing-editor/src/editor/utils/stack-utils';
import { getCurrentStack, showStack } from 'thing-editor/src/editor/utils/stack-utils';
import type HowlSound from 'thing-editor/src/engine/HowlSound';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import BgMusic from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music.c';

const profilerProps = { className: 'music-profiler' };
const PROFILER_COLORS = [
	{
		background: '#ffeacf',
		borderColor: '#ffbea2'
	},
	{
		background: '#ffcfea',
		borderColor: '#ffa2be'
	},
	{
		background: '#cfffea',
		borderColor: '#a2ffbe'
	},
	{
		background: '#eacfff',
		borderColor: '#bea2ff'
	},
	{
		background: '#eaffcf',
		borderColor: '#beffa2'
	},
	{
		background: '#cfeaff',
		borderColor: '#a2beff'
	}
];

interface SoundProfilerProps extends ClassAttributes<SoundProfiler> {
	onCloseClick: () => void;
}

interface SoundProfilerState {
	widthZoom: number;
	heightZoom: number;
}

interface ProfilerEntry {
	soundId: string;
	stack: DebugStack;
	title: string;
	sound: HowlSound;
	durationFrames: number;
	startFrame: number;
	y: number;
	background: string;
	borderColor: string;

}

export default class SoundProfiler extends ComponentDebounced<SoundProfilerProps, SoundProfilerState> {

	static soundsProfilerColorsCache: KeyedMap<typeof PROFILER_COLORS[0]> = {};
	static soundsProfilerArray: ProfilerEntry[] = [];
	static soundsProfilerLane = 0;
	static ignoreSoundProfile = 0;

	interval = 0;

	componentDidMount() {
		this.interval = window.setInterval(() => {
			this.refresh();
		}, 1000 / 60);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	renderMusicItem(m: BgMusic, i: number) {
		let state;
		if (m.__currentFragment) {
			if (!m.__currentFragment.playing()) {
				state = R.div({ className: 'danger music-profiler-row-text' }, 'ref to not playing fragment');
			} else {
				state = R.div({ className: 'sound-vol-bar-bg' },
					R.div({ className: 'sound-vol-bar', title: 'Volume: ' + m.__getVolume(), style: { width: m.__getVolume()! * 100 } })
				);
			}
		} else {
			state = R.div({ className: 'sound-vol-bar-bg' },
				'stopped'
			);
		}
		return R.div({
			className: 'clickable music-profiler-row', key: i, onClick: () => {
				if (m.getRootContainer() === game.currentContainer) {
					game.editor.ui.sceneTree.selectInTree(m);
				} else {
					let root = m.getRootContainer();
					if (!root) {
						root = m;
						while (root.parent) {
							root = root.parent;
						}
					}
					game.editor.ui.modal.notify('Cant select music object');
				}
			}
		}, R.span({ className: 'music-profiler-row-text', title: 'Intro sound: ' + (m.intro || 'NONE') }, m.intro), R.span({ className: 'music-profiler-row-text', title: 'Loop sound: ' + (m.loop || 'NONE') }, m.loop), state
		);
	}

	render(): ComponentChild {
		let soundsLanes = [];
		SoundProfiler.soundsProfilerArray = SoundProfiler.soundsProfilerArray.filter(i => (i.startFrame + i.durationFrames) > (game.time - 200) && (i.startFrame <= game.time));

		for (let soundEntry of SoundProfiler.soundsProfilerArray) {
			soundsLanes.push(R.div({
				onClick: () => {
					soundEntry.sound.lastPlayStartFrame = -1000;
					SoundProfiler.ignoreSoundProfile++;
					game.Sound.play(soundEntry.soundId);
					SoundProfiler.ignoreSoundProfile--;
					showStack(soundEntry.stack);
				}, className: 'sound-profiler-sound-entry clickable', title: soundEntry.title, style: { background: soundEntry.background, borderColor: soundEntry.borderColor, top: soundEntry.y, right: (game.time - soundEntry.startFrame - soundEntry.durationFrames) * 2 - 10, width: soundEntry.durationFrames * 2 }
			}, soundEntry.soundId));
		}

		let bgMusicsList;
		let profilerBody;

		if (game.__EDITOR_mode) {
			profilerBody = R.fragment(R.btn('Start', () => {
				game.editor.ui.viewport.onTogglePlay();
			}), ' game execution to profile sounds.');
		} else if (game.editor.settings.getItem('sound-muted')) {
			profilerBody = R.fragment('Sounds is muted. ', R.btn('Enable Sounds', () => {
				game.editor.toggleSoundMute();
			}), ' to activate sound profiler.');
		} else {
			bgMusicsList = BgMusic.__allActiveMusics.map(this.renderMusicItem);
			profilerBody = R.div(profilerProps, bgMusicsList, R.div({ className: 'sound-profiler-lane' }, soundsLanes));
		}
		return R.fragment(
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn', {key: 'Escape'}),
			profilerBody
		);
	}


	static onSoundPlay(soundId: string, volume: number) {
		if (SoundProfiler.ignoreSoundProfile) {
			return;
		}
		let sound = Lib.getSound(soundId);
		let durationFrames = Math.round(sound.duration() * 60);

		let colors = SoundProfiler.soundsProfilerColorsCache[soundId];
		if (!colors) {
			let hash = 0;
			for (let i = 0; i < soundId.length; i++) {
				hash += soundId.charCodeAt(i);
			}
			colors = PROFILER_COLORS[hash % PROFILER_COLORS.length];
			SoundProfiler.soundsProfilerColorsCache[soundId] = colors;
		}

		SoundProfiler.soundsProfilerArray.push({
			soundId,
			stack: getCurrentStack(soundId),
			title: soundId + ' Vol: ' + volume,
			sound,
			durationFrames,
			startFrame: game.time,
			y: SoundProfiler.soundsProfilerLane,
			background: colors.background,
			borderColor: colors.borderColor
		});
		SoundProfiler.soundsProfilerLane += 18;
		if (SoundProfiler.soundsProfilerLane >= 61) {
			SoundProfiler.soundsProfilerLane -= 60;
		}
	}

	static toggle() {
		game.editor.settings.setItem('sound-profiler-shown', !game.editor.settings.getItem('sound-profiler-shown'));
		SoundProfiler.renderWindow();
	}

	static renderWindow() {
		if (game.editor.settings.getItem('sound-profiler-shown')) {
			SoundProfiler.show();
		} else {
			SoundProfiler.hide();
		}
	}

	static show() {
		showAdditionalWindow('sound-profiler', 'SoundProfiler', 'SoundProfiler',
			R.div({ title: '' },
				h(SoundProfiler, { onCloseClick: SoundProfiler.toggle }),
			), 50, 50, 80, 80, 300, 200);
		Window.bringWindowForward('#sound-profiler');
	}

	static hide() {
		hideAdditionalWindow('sound-profiler');
	}
}

window.setTimeout(SoundProfiler.renderWindow, 100,);

editorEvents.on('soundPlay', SoundProfiler.onSoundPlay);

MainMenu.injectMenu('settings', [{
	name: () => {
		return R.fragment(R.span({ className: '.menu-icon' }, game.editor.settings.getItem('sound-profiler-shown') ? '☑' : '☐'), ' Sound profiler');
	},
	onClick: () => {
		SoundProfiler.toggle();
	},
	stayAfterClick: true
}], 'sound-profiler');
