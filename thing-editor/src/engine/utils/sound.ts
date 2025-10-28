/// #if EDITOR
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import MusicFragment from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment';
import { CTRL_READABLE } from './utils';
/// #endif

/// #if DEBUG
import { render } from 'preact';
import waitForCondition from 'thing-editor/src/engine/lib/assets/src/utils/wait-for-condition';
import IndexedDBUtils from 'thing-editor/src/engine/utils/indexed-db-utils';
import R from '../basic-preact-fabrics';
import FlyText from '../lib/assets/src/basic/fly-text.c';
import debugPanelStyle from './sound-debug-panel.css?raw';
/// #endif

import HowlSound, { rootAudioContext } from 'thing-editor/src/engine/HowlSound';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import { MIN_VOL_THRESHOLD } from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment';

export const slideAudioParamTo = (param:AudioParam, val:number, duration:number, fromValue = param.value) => {
	param.cancelScheduledValues(rootAudioContext.currentTime);
	if (duration > 0) {
		param.setValueCurveAtTime([fromValue, val], rootAudioContext.currentTime, duration);
	} else {
		param.setValueAtTime(val, rootAudioContext.currentTime);
	}
};

/// #if DEBUG
let EMPTY_SOUND:HowlSound;
/// #endif

export default class Sound {

	static outputs = {} as{
		MUSIC: GainNode;
		FX: GainNode;
		[key: string]: GainNode;
	};

	/** volume is quadratic. 0.1 - sound off. 1.0 - max vol */
	static get soundsVol() {
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			return 1;
		}
		/// #endif
		return soundsVol;
	}

	static set soundsVol(v) {
		assert(!isNaN(v), 'invalid value for \'soundsVol\'. Valid number value expected.', 10001);
		v = Math.max(0, Math.min(1, v));
		soundsVol = v;
		slideAudioParamTo(Sound.outputs.FX.gain, v * v, 0.1);
		game.settings.setItem('soundsVol', soundsVol);
	}

	static setSoundsVol(v: number) {
		Sound.soundsVol = v;
	}

	static setMusicVol(v: number) {
		Sound.musicVol = v;
	}

	static _onVisibilityChange(visible: boolean) {
		/// #if EDITOR
		return;
		/// #endif
		for (let key in Sound.outputs) {
			const node = Sound.outputs[key];
			slideAudioParamTo(node.gain, visible ? soundsVol * soundsVol : 0, 0.1);
		}
	}

	/** volume is quadratic. 0.1 - sound off. 1.0 - max vol */

	static get musicVol() {
		return musicVol;
	}

	static set musicVol(v) {
		assert(!isNaN(v), 'invalid value for \'musicVol\'. Valid number value expected.', 10001);
		v = Math.max(0, Math.min(1, v));
		musicVol = v;
		game.settings.setItem('musicVol', musicVol);
		slideAudioParamTo(Sound.outputs.MUSIC.gain, v * v, 0.1);
	}

	static get fullVol() {
		return Math.max(soundsVol, musicVol);
	}

	static set fullVol(v) {
		let a = game.settings.getItem('musicEnabled', true);
		let b = game.settings.getItem('soundEnabled', true);
		if (!a && !b) {
			a = b = true;
		}
		if (a) {
			Sound.musicVol = v;
		} else {
			game.settings.setItem('musicVolEnabling', v);
		}
		if (b) {
			Sound.soundsVol = v;
		} else {
			game.settings.setItem('soundsVolEnabling', v);
		}
	}

	static get musicEnabled() {
		return musicVol >= MIN_VOL_THRESHOLD;
	}

	static set musicEnabled(val) {
		if (Sound.musicEnabled !== val) {
			if (val) {
				Sound.musicVol = game.settings.getItem('musicVolEnabling', game.projectDesc.defaultMusVol);
			} else {
				game.settings.setItem('musicVolEnabling', musicVol);
				Sound.musicVol = 0;
			}
			Sound.rememberEnableLevels();
		}
	}

	static rememberEnableLevels() {
		if (!enablingSaveTimeout) {
			enablingSaveTimeout = window.setTimeout(_rememberEnableLevels, 10);
		}
	}

	static toggleMusic() {
		Sound.musicEnabled = !Sound.musicEnabled;
	}

	static get soundEnabled() {
		return soundsVol > MIN_VOL_THRESHOLD;
	}

	static set soundEnabled(val) {
		if (Sound.soundEnabled !== val) {
			if (val) {
				Sound.soundsVol = game.settings.getItem('soundsVolEnabling', game.projectDesc.defaultSoundsVol);
			} else {
				game.settings.setItem('soundsVolEnabling', soundsVol);
				Sound.soundsVol = 0;
			}
			Sound.rememberEnableLevels();
		}
	}

	static toggleSounds() {
		Sound.soundEnabled = !Sound.soundEnabled;
	}

	static toggleFullSound() {
		if (Sound.soundEnabled || Sound.musicEnabled) {
			Sound.soundEnabled = false;
			Sound.musicEnabled = false;
		} else {
			Sound.musicEnabled = game.settings.getItem('musicEnabled', true);
			Sound.soundEnabled = game.settings.getItem('soundEnabled', true);
		}
	}

	static get isFullSoundEnabled() {
		return Sound.soundEnabled || Sound.musicEnabled;
	}

	static init() {
		Sound.soundsVol = game.settings.getItem('soundsVol', game.projectDesc.defaultSoundsVol);
		Sound.musicVol = game.settings.getItem('musicVol', game.projectDesc.defaultMusVol);
	}

	/// #if EDITOR
	static __resetSounds() {
		MusicFragment.__stopAll();
		for (let soundName in Lib.__soundsList) {
			let snd = Lib.getSound(soundName);
			snd.stop();
			snd.lastPlayStartFrame = 0;
		}
		pitches = {};
		pitchedPlayTimeouts = {};
	}
	/// #endif

	static addMasterNode(node: AudioNode) {
		const allOutputs = new Set<GainNode>();
		for (let key in this.outputs) {
			allOutputs.add(this.outputs[key]);
		}
		allOutputs.forEach((output) => {
			output.disconnect();
			output.connect(node);
		});
		node.connect(masterNodes[0]);
		masterNodes.unshift(node);
	}

	static isSoundsLockedByBrowser = true;

	static play(soundId: string, volume = 1.0, rate = 1.0, seek = 0.0) {
		/// #if DEBUG

		rate = rate * game.pixiApp.ticker.speed;
		/// #endif
		if (Sound.isSoundsLockedByBrowser) {
			return;
		}
		let s = Lib.getSound(soundId);

		/// #if DEBUG
		/*
		/// #endif
		if(!s) {
			let er = new Error('Attempt to play unknown sound "' + soundId + '"');
			window.setTimeout(() => {
				throw er;
			});
			return;
		}
		//*/

		if (s.lastPlayStartFrame < game.time
			/// #if EDITOR
			|| game.__EDITOR_mode
		/// #endif
		) {
			/// #if DEBUG
			Sound.__highlightPlayedSound(soundId);
			/// #endif


			volume = volume * Sound.soundsVol * Sound.soundsVol;
			if (volume > MIN_VOL_THRESHOLD
			/// #if DEBUG
			&& (s !== EMPTY_SOUND)
			/// #endif
			) {
				try {
					s.play(volume, rate, seek);
					s.lastPlayStartFrame = game.time + 2;
					/// #if DEBUG
					refreshSndDebugger();
					/// #endif

					/// #if EDITOR
					editorEvents.emit('soundPlay', soundId, volume);
					/// #endif
				} catch (_er) { }
			}
		}
	}

	static playPitched(soundId: string, resetTimeout = 200, pitchStep = 1.0594630943592953, pitchLimit = 3) {
		let prevTime = pitchedPlayTimeouts[soundId];
		let d = game.time - prevTime;
		if (d < 2) {
			return;
		}

		let pitch;
		if (d < resetTimeout) {
			pitch = Math.min(pitches[soundId] * pitchStep, pitchLimit);
		} else {
			pitch = 1;
		}
		pitches[soundId] = pitch;
		pitchedPlayTimeouts[soundId] = game.time;
		Sound.play(soundId, 1, pitch, 0);
	}

	static _unlockSound() {
		if (Sound.isSoundsLockedByBrowser) {
			Sound.isSoundsLockedByBrowser = false;
			if (game.classes.BgMusic) {
				game.classes.BgMusic._recalculateMusic();
			}
		}
	}

	/// #if DEBUG
	static __loadSoundOverrides() {
		__loadSoundOverrides();
	}

	static __refreshDebugger() {
		if (sndDebuggerShowed) {
			showSndDebugger();
		}
	}

	static __toggleDebugger() {
		if (sndDebuggerShowed) {
			hideSndDebugger();
			return;
		}
		showSndDebugger();
	}

	static __highlightPlayedSound(soundId: string) {
		LAST_HIT_TIME.set(soundId, Date.now());
		if (sndDebuggerShowed) {
			if (!Lib.hasSound(soundId)) {
				Lib.__soundsList[soundId] = EMPTY_SOUND;
				if (sndDebuggerShowed) {
					setTimeout(() => Sound.__highlightPlayedSound(soundId), 20);
				}
			}
			if (!game.__EDITOR_mode) {
				let soundTitle: HTMLDivElement = document.querySelector('.sounds-debug-panel .' + cleanupClassName(soundId))!;
				if (soundTitle) {
					soundTitle.style.color = 'rgb(0,150,0)';
					if (!__animatedSoundItems.includes(soundTitle)) {
						__animatedSoundItems.push(soundTitle);
					}
				}
			}
			refreshSndDebugger();
		}
	}

	/// #endif

	/// #if EDITOR
	static __stop() {
		if (game.__EDITOR_mode) {
			for (let soundName in Lib.__soundsList) {
				Lib.getSound(soundName).stop();
			}
		}
	}
	/// #endif
}

/// #if DEBUG
const initEmptySound = async () => {
	EMPTY_SOUND = new HowlSound('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV');
	EMPTY_SOUND.__isEmptySound = true;
};

const __animatedSoundItems = [] as HTMLDivElement[];
const __onUpdate = () => {
	for (let i = __animatedSoundItems.length - 1; i >= 0; i--) {
		const e = __animatedSoundItems[i];
		const color = e.style.color.split(/\(|\)|,/gm);
		let RB = parseInt(color[1]);
		let G = parseInt(color[2]);
		if (G < 255) {
			G++;
		}
		if (RB < 255) {
			RB ++;
		}
		e.style.color = 'rgb(' + RB + ',' + G + ',' + RB + ')';
		if (RB === 255) {
			__animatedSoundItems.splice(i, 1);
		}
	}
};

setTimeout(() => {
	/// #if EDITOR
	editorEvents.on('projectDidOpen', () => {
		game.on('updated', __onUpdate);
	});
	return;
	/// #endif
	game.on('updated', __onUpdate);
}, 10);

setTimeout(initEmptySound, 0);
/// #endif

/* playPitched - increases pitch each time until timeout*/
let pitches: KeyedMap<number> = {};
let pitchedPlayTimeouts: KeyedMap<number> = {};

let enablingSaveTimeout = 0;
function _rememberEnableLevels() {
	enablingSaveTimeout = 0;
	if (Sound.soundEnabled || Sound.musicEnabled) {
		game.settings.setItem('soundEnabled', Sound.soundEnabled);
		game.settings.setItem('musicEnabled', Sound.musicEnabled);
	}
}

let soundsVol: number;
let musicVol: number;

/// #if DEBUG
const LAST_HIT_TIME = new Map() as Map<string, number>;
/// #endif


/// #if EDITOR
(Sound.play as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.play as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return game.editor.chooseSound('Choose sound to play:');
};

(Sound.playPitched as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.setSoundsVol as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.setMusicVol as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.toggleMusic as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.toggleSounds as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.toggleFullSound as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.init as SelectableProperty).___EDITOR_isHiddenForChooser = true;

/// #endif

/// #if DEBUG

// ==============================================
// ===== SOUND DEBUG PANEL ======================
// ==============================================

const classesCache = new Map() as Map<string, string>;
const cleanupClassName = (soundId:string) => {
	if (!classesCache.has(soundId)) {
		classesCache.set(soundId, 'snd-name-' + soundId.replace(/\//gm, '_s_'));
	}
	return classesCache.get(soundId);
};

const defaultSoundsUrls: KeyedMap<string> = {};

function overrideSound(name: string, src?: string) {

	if (!defaultSoundsUrls[name] && (Lib.hasSound(name) && !Lib.getSound(name).__isEmptySound) && src) {
		defaultSoundsUrls[name] = (Lib.getSound(name) as any)._src;
		assert(defaultSoundsUrls[name], 'Howler is changed');
	}
	let url = src || defaultSoundsUrls[name];
	Lib.__overrideSound(name, url || EMPTY_SOUND); //@ts-ignore
}


function toggleSoundsPanelLeft() {
	(game.editor || game).settings.setItem('__sounds-panel-is-left', !(game.editor || game).settings.getItem('__sounds-panel-is-left'));
	showSndDebugger();
}

let sndDebugger: HTMLDivElement;
let sndDebuggerShowed = false;

setTimeout(() => {
	if ((game.editor || game).settings?.getItem('_sound-debugger-shown')) {
		showSndDebugger();
	}
}, 10);

function hideSndDebugger() {
	sndDebugger.style.display = 'none';
	sndDebuggerShowed = false;
	(game.editor || game).settings.setItem('_sound-debugger-shown', false);
}

let libSounds: KeyedMap<HowlSound>;
async function __loadSoundOverrides() {
	if (!libSounds) {
		libSounds = Lib.sounds;

		await waitForCondition(() => {
			return game.loadingProgress === 100;
		});

		const overrides = IndexedDBUtils.getEntriesList('sound');
		for (let sndName of overrides) {
			const data = IndexedDBUtils.load(sndName, 'sound');
			if (data) {
				overrideSound(sndName, data.data);
			}
		}
	}
}

let showSndDebuggerTimeOut = 0;
function showSndDebugger() {
	if (!showSndDebuggerTimeOut) {
		sndDebuggerShowed = true;
		showSndDebuggerTimeOut = window.setTimeout(showSndDebuggerInner, 0);
	}
}

function refreshSndDebugger() {
	if (sndDebugger && sndDebuggerShowed) {
		showSndDebugger();
	}
}

function renderSoundPanelItem(soundName:string) {
	const overrideData = IndexedDBUtils.load(soundName, 'sound')!;
	let info;
	if (overrideData) {
		info = R.fragment(' UPLOADED (' + overrideData!.fileName + ')', R.button({ className: 'snd-clear', onClick: () => {
			IndexedDBUtils.save(soundName, 'sound');
			showSndDebugger();
			overrideSound(soundName);
		}
		}, '×'));
	} else {
		info = '-';
	}

	return R.tr({key: soundName},
		R.td({
			className: (Lib.getSound(soundName) === EMPTY_SOUND) ? 'snd-name snd-name-empty ' + cleanupClassName(soundName) : 'snd-name ' + cleanupClassName(soundName),
			onClick: (ev: MouseEvent) => {
				if (ev.ctrlKey || ev.metaKey) {
					const txt = soundName.split('/').pop()!;
					navigator.clipboard.writeText(txt);
					/// #if EDITOR
					game.editor.copyToClipboard(txt);
					return;
					/// #endif
					FlyText.flyText('Copied to clipboard: ' + txt, 200, 200);
				} else {
					const s = Lib.getSound(soundName);
					s.lastPlayStartFrame = -1;
					s.play();
					if (timeouts[soundName]) {
						clearTimeout(timeouts[soundName]);
						delete timeouts[soundName];
					}
					timeouts[soundName] = window.setTimeout(() => {
						if (Lib.hasSound(soundName)) {
							Lib.getSound(soundName).stop();
						}
					}, 2000);
				}
			}
		}, soundName.startsWith('snd/') ? soundName.substring(4) : soundName),
		R.td(null, R.button({ className: 'snd-override', onClick: async () => {
			const sndData = await IndexedDBUtils.openFile(soundName);
			let a = new Audio(sndData[0].data);
			a.play();
			window.setTimeout(() => {
				a.pause();
			}, 2000);
			overrideSound(soundName, sndData[0].data);
			showSndDebugger();
		}
		}, 'Choose...')),
		R.td(null, info)
	);
}

function renderSoundsPanel() {
	const items = [];

	let list: string[] | undefined;
	const sortByTime = (game.editor || game).settings.getItem('__sounds-panel-sort-by-time', -1);
	const sortByName = (game.editor || game).settings.getItem('__sounds-panel-sort-by-name', 0);
	if (sortByTime) {
		list = Object.keys(Lib.__soundsList);
		if (sortByTime > 0) {
			list.sort((a, b) => {
				return (LAST_HIT_TIME.get(a) || 0) - (LAST_HIT_TIME.get(b) || 0);
			});
		} else {
			list.sort((b, a) => {
				return (LAST_HIT_TIME.get(a) || 0) - (LAST_HIT_TIME.get(b) || 0);
			});
		}
	} else if (sortByName) {
		list = Object.keys(Lib.__soundsList);
		if (sortByName > 0) {
			list.sort((a, b) => {
				return (a > b) ? -1 : 1;
			});
		} else {
			list.sort((b, a) => {
				return (a > b) ? -1 : 1;
			});
		}
	}

	if (list) {
		for (const soundId of list) {
			items.push(renderSoundPanelItem(soundId));
		}
	} else {
		for (const soundId in Lib.__soundsList) {
			items.push(renderSoundPanelItem(soundId));
		}
	}

	return R.fragment(
		(game.editor || game).settings.getItem('__sounds-panel-is-left') ? R.span({className: 'panel-is-left'}) : undefined,
		R.button({
			className: 'close-sounds-button',
			onClick: Sound.__toggleDebugger
		}, '×'),
		R.button({
			onClick: toggleSoundsPanelLeft
		}, '< >'),
		R.div({className: 'list-header'}, 'Sort by: ',
			R.span({className: 'sort-button', onClick: () => {
				if (sortByName > 0) {
					(game.editor || game).settings.setItem('__sounds-panel-sort-by-name', -1);
				} else {
					(game.editor || game).settings.setItem('__sounds-panel-sort-by-name', 1);
				}
				(game.editor || game).settings.removeItem('__sounds-panel-sort-by-time');
				showSndDebugger();
			}
			}, 'name ', sortByName ? ((sortByName > 0) ? '⮟' : '⮝') : '\u00A0'),

			R.span({className: 'sort-button', onClick: () => {
				if (sortByTime > 0) {
					(game.editor || game).settings.setItem('__sounds-panel-sort-by-time', -1);
				} else {
					(game.editor || game).settings.setItem('__sounds-panel-sort-by-time', 1);
				}
				(game.editor || game).settings.removeItem('__sounds-panel-sort-by-name');
				showSndDebugger();
			}
			}, 'play-time ', sortByTime ? ((sortByTime > 0) ? '⮟' : '⮝') : '\u00A0')
		),
		R.div({
			className: 'sounds-debug-panel-body',
			/// #if EDITOR
			title: CTRL_READABLE + ' + click to copy sound\'s name'
			/*
			/// #endif
			title: 'ctrl + click to copy sound\'s name'
			//*/

		},
		R.table({border: 0, cellspacing: 0, cellpadding: 0},
			items
		)
		),
		/*R.button({onClick: () => {
			// TODO:
		}}, 'Download sounds...'),*/
		R.button({onClick: async () => {
			const files = await IndexedDBUtils.openFile('', undefined, undefined, true);
			for (const fileData of files) {
				let soundName = fileData.fileName.replace(/.wav$/, '');
				if (!Lib.hasSound(soundName)) {
					soundName = 'snd/' + soundName;
				}
				Lib.__overrideSound(soundName, fileData.data);
				IndexedDBUtils.save(soundName, 'sound', fileData);
			}
			showSndDebugger();
		}}, 'Upload sounds...'),
		R.button({
			className: 'close-sounds-button',
			onClick: () => {
				const ids = Object.keys(Lib.sounds);
				for (const id of ids) {
					if (Lib.sounds[id].__isEmptySound) {
						delete Lib.sounds[id];
					}
				}
				showSndDebugger();
			}
		}, 'Clear optionals')

	);
}

async function showSndDebuggerInner() {
	showSndDebuggerTimeOut = 0;
	if (!sndDebuggerShowed) {
		return;
	}
	/// #if EDITOR
	//return;
	/// #endif

	if (!sndDebugger) { // eslint-disable-line no-unreachable

		game.applyCSS(debugPanelStyle);
		sndDebugger = document.createElement('div');
		sndDebugger.classList.add('sounds-debug-panel');
		window.document.body.appendChild(sndDebugger);
		await __loadSoundOverrides();
	}

	(game.editor || game).settings.setItem('_sound-debugger-shown', true);
	render(renderSoundsPanel(), sndDebugger);
	sndDebugger.style.display = 'block';
}

const timeouts: KeyedMap<number> = {};

window.addEventListener('keydown', (ev) => {
	/// #if EDITOR
	//return;
	/// #endif
	if (ev.keyCode === 115) {
		Sound.__toggleDebugger();
	}
});

/// #if EDITOR
export const ACTION_ICON_SOUND = R.img({ src: '/thing-editor/img/timeline/sound.png' });
(Sound.play as SelectableProperty).___EDITOR_actionIcon = ACTION_ICON_SOUND;
/// #endif


/// #endif

/// #if EDITOR
editorEvents.on('playToggle', () => {
	while (__animatedSoundItems.length) {
		__animatedSoundItems.pop()!.style.color = 'rgb(255,255,255)';
	}
});

/// #endif

let masterNodes = [rootAudioContext.destination] as AudioNode[];

Sound.outputs['Sound.soundsVol'] = Sound.outputs.FX = rootAudioContext.createGain();
Sound.outputs.MUSIC = rootAudioContext.createGain();
Sound.outputs.FX.connect(rootAudioContext.destination);
Sound.outputs.MUSIC.connect(rootAudioContext.destination);
slideAudioParamTo(Sound.outputs.FX.gain, 0, 0);
slideAudioParamTo(Sound.outputs.MUSIC.gain, 0, 0);
