/// #if EDITOR
import MusicFragment from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment';
/// #endif

import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import HowlSound from 'thing-editor/src/engine/HowlSound';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

const MIN_VOL_ENABLE = 0.05;

function normalizeVolForEnabling(vol: number, defaultVol: number) {
	return (vol > MIN_VOL_ENABLE) ? vol : defaultVol;
}

export default class Sound {

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
		game.settings.setItem('soundsVol', soundsVol);
	}

	static setSoundsVol(v: number) {
		Sound.soundsVol = v;
	}

	static setMusicVol(v: number) {
		Sound.musicVol = v;
	}

	static get musicVol() {
		return musicVol;
	}

	static set musicVol(v) {
		assert(!isNaN(v), 'invalid value for \'musicVol\'. Valid number value expected.', 10001);
		v = Math.max(0, Math.min(1, v));
		if (musicVol !== v) {
			if (game.classes.BgMusic) {
				game.classes.BgMusic._clearCustomFades(0.2);
			}
		}
		musicVol = v;
		game.settings.setItem('musicVol', musicVol);
		if (game.classes.BgMusic) {
			game.classes.BgMusic._recalculateMusic();
		}
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
		return musicVol >= MIN_VOL_ENABLE;
	}

	static set musicEnabled(val) {
		if (Sound.musicEnabled !== val) {
			if (game.classes.BgMusic) {
				game.classes.BgMusic._clearCustomFades(0.2);
			}
			if (val) {
				Sound.musicVol = normalizeVolForEnabling(game.settings.getItem('musicVolEnabling'), game.projectDesc.defaultMusVol);
			} else {
				game.settings.setItem('musicVolEnabling', musicVol);
				Sound.musicVol = 0;
			}
			Sound.rememberEnablings();
		}
	}

	static rememberEnablings() {
		if (!enablingSaveTimeout) {
			enablingSaveTimeout = window.setTimeout(_rememberEnablings, 10);
		}
	}

	static toggleMusic() {
		Sound.musicEnabled = !Sound.musicEnabled;
	}

	static get soundEnabled() {
		return soundsVol >= MIN_VOL_ENABLE;
	}

	static set soundEnabled(val) {
		if (Sound.soundEnabled !== val) {
			if (val) {
				Sound.soundsVol = normalizeVolForEnabling(game.settings.getItem('soundsVolEnabling'), game.projectDesc.defaultSoundsVol);
			} else {
				game.settings.setItem('soundsVolEnabling', soundsVol);
				Sound.soundsVol = 0;
			}
			Sound.rememberEnablings();
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
		soundsVol = game.settings.getItem('soundsVol', game.projectDesc.defaultSoundsVol);
		musicVol = game.settings.getItem('musicVol', game.projectDesc.defaultMusVol);
	}

	/// #if EDITOR
	static __resetSounds() {
		MusicFragment.__stopAll();
		for (let soundName in Lib.__soundsList) {

			let snd = Lib.getSound(soundName);
			snd.off('fade');
			snd.stop();
			snd.lastPlayStartFrame = 0;
		}
		pitches = {};
		pitchedPlayTimeouts = {};
	}
	/// #endif

	static isSoundsLockedByBrowser = false;

	static play(soundId: string, volume = 1.0, rate = 1.0, seek = 0.0, multiInstanced = false) {
		/// #if DEBUG
		rate = rate * game.pixiApp.ticker.speed;
		/// #endif
		if (Sound.isSoundsLockedByBrowser || (!game.isVisible // eslint-disable-line no-constant-condition
			/// #if EDITOR
			&& false
			/// #endif
		)) {
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
			if (!multiInstanced && s.playing()) {
				s.stop();
			}
			volume = volume * Sound.soundsVol * Sound.soundsVol;
			if (volume > 0.01) {
				try {
					if (multiInstanced) {
						s.soundIdSaved = s.play();
						s.volume(volume, s.soundIdSaved);
						s.rate(rate, s.soundIdSaved);
						if (seek !== 0) {
							s.seek(seek, s.soundIdSaved);
						}
					} else {
						s.volume(volume);
						s.rate(rate);
						if (seek !== 0) {
							s.seek(seek);
						}
						s.soundIdSaved = s.play(s.soundIdSaved);
					}
					s.lastPlayStartFrame = game.time + 2;
					/// #if DEBUG
					highlightPlayedSound(soundId);
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
		Sound.play(soundId, 1, pitch, 0, true);
	}

	static checkSoundLockByBrowser() {
		Sound.isSoundsLockedByBrowser = true;
		game.loadingAdd(LOADING_OWNER_NAME);
		EMPTY_SOUND = new HowlSound({ src: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV' });
		const blockedHanlder = () => soundLockHandler(true);
		const unblockedHanlder = () => soundLockHandler(false);
		EMPTY_SOUND.once('playerror', blockedHanlder);
		EMPTY_SOUND.once('end', unblockedHanlder);
		soundLockTimeoutId = window.setTimeout(blockedHanlder, 500);
		try {
			EMPTY_SOUND.play();
		} catch (_er) {
			soundLockHandler(true);
		}
	}

	static _unlockSound() {
		if (Sound.isSoundsLockedByBrowser) {
			soundLockHandler(false);
		}
	}

	/// #if DEBUG
	static __loadSoundOverrides() {
		__loadSoundOverrides();
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

let EMPTY_SOUND: HowlSound;
let soundLockTimeoutId = 0;
let isHandlerShootAlready = false;

const LOADING_OWNER_NAME = 'checkSoundLock';

const soundLockHandler = (isLocked = false) => {
	if (!isHandlerShootAlready) {
		game.loadingRemove(LOADING_OWNER_NAME);
		isHandlerShootAlready = true;
		if (soundLockTimeoutId) {
			clearTimeout(soundLockTimeoutId);
		}
	}
	if (!isLocked) {
		EMPTY_SOUND.off('playerror');
		EMPTY_SOUND.off('play');
		EMPTY_SOUND.unload();
		Sound.isSoundsLockedByBrowser = false;
		if (game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}
	}
};

/* playPitched - increases pitch each time until timeout*/
let pitches: KeyedMap<number> = {};
let pitchedPlayTimeouts: KeyedMap<number> = {};

let enablingSaveTimeout = 0;
function _rememberEnablings() {
	enablingSaveTimeout = 0;
	if (Sound.soundEnabled || Sound.musicEnabled) {
		game.settings.setItem('soundEnabled', Sound.soundEnabled);
		game.settings.setItem('musicEnabled', Sound.musicEnabled);
	}
}

let soundsVol: number;
let musicVol: number;

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

const defaultSoundsUrls: KeyedMap<string> = {};

function overrideSound(name: string, src?: string) {

	if (!defaultSoundsUrls[name]) {
		defaultSoundsUrls[name] = (Lib.getSound(name) as any)._src;
		assert(defaultSoundsUrls[name], 'Howler is changed');
	}
	Lib.__overrideSound(name, src || defaultSoundsUrls[name]);
}


let sndDebugger: HTMLDivElement;
let sndDebuggerShowed = false;
function hideSndDebugger() {
	sndDebugger.style.display = 'none';
	sndDebuggerShowed = false;
}

function highlightPlayedSound(soundId: string) {
	if (sndDebuggerShowed) {
		let soundTitle: HTMLDivElement = document.querySelector('.sounds-debug-panel .snd-name-' + soundId)!;
		soundTitle.classList.remove('animate-sound-play');
		window.setTimeout(() => {
			soundTitle.classList.add('animate-sound-play');
		}, 5);
	}
}

function __loadSoundOverrides() {

}


/// #endif
