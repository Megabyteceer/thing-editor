import type { KeyedMap, KeyedObject, SelectableProperty } from "thing-editor/src/editor/env";
/// #if EDITOR
import MusicFragment from "thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment";
/// #endif

import { editorEvents } from "thing-editor/src/editor/utils/editor-events";
import HowlSound from "thing-editor/src/engine/HowlSound";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
const MIN_VOL_THRESHOLD = 0.005;
const MIN_VOL_ENABLE = 0.05;

function normalizeVolForEnabling(vol: number, defaultVol: number) {
	return (vol > MIN_VOL_ENABLE) ? vol : defaultVol;
}

export default class Sound {

	static get soundsVol() {
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			return 1;
		}
		/// #endif
		return soundsVol;
	}

	static set soundsVol(v) {
		assert(!isNaN(v), "invalid value for 'soundsVol'. Valid number value expected.", 10001);
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
		assert(!isNaN(v), "invalid value for 'musicVol'. Valid number value expected.", 10001);
		v = Math.max(0, Math.min(1, v));
		if(musicVol !== v) {
			if(game.classes.BgMusic) {
				(game.classes.BgMusic as any)._clearCustomFades(0.2);
			}
		}
		musicVol = v;
		game.settings.setItem('musicVol', musicVol);
		if(game.classes.BgMusic) {
			(game.classes.BgMusic as any)._recalculateMusic();
		}
	}

	static get fullVol() {
		return Math.max(soundsVol, musicVol);
	}

	static set fullVol(v) {
		let a = game.settings.getItem('musicEnabled', true);
		let b = game.settings.getItem('soundEnabled', true);
		if(!a && !b) {
			a = b = true;
		}
		if(a) {
			Sound.musicVol = v;
		} else {
			game.settings.setItem('musicVolEnabling', v);
		}
		if(b) {
			Sound.soundsVol = v;
		} else {
			game.settings.setItem('soundsVolEnabling', v);
		}
	}

	static get musicEnabled() {
		return musicVol >= MIN_VOL_THRESHOLD;
	}

	static set musicEnabled(val) {
		if(Sound.musicEnabled !== val) {
			if(game.classes.BgMusic) {
				(game.classes.BgMusic as any)._clearCustomFades(0.2);
			}
			if(val) {
				Sound.musicVol = normalizeVolForEnabling(game.settings.getItem('musicVolEnabling'), game.projectDesc.defaultMusVol);
			} else {
				game.settings.setItem('musicVolEnabling', musicVol);
				Sound.musicVol = 0;
			}
			Sound.rememberEnablings();
		}
	}

	static rememberEnablings() {
		if(!enablingSaveTimeout) {
			enablingSaveTimeout = setTimeout(_rememberEnablings, 10);
		}
	}

	static toggleMusic() {
		Sound.musicEnabled = !Sound.musicEnabled;
	}

	static get soundEnabled() {
		return soundsVol >= MIN_VOL_THRESHOLD;
	}

	static set soundEnabled(val) {
		if(Sound.soundEnabled !== val) {

			if(val) {
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
		if(Sound.soundEnabled || Sound.musicEnabled) {
			Sound.soundEnabled = false;
			Sound.musicEnabled = false;
		} else {
			Sound.musicEnabled = game.settings.getItem('musicEnabled', true);
			Sound.soundEnabled = game.settings.getItem('soundEnabled', true);
		}
	}

	static init() {
		soundsVol = game.settings.getItem('soundsVol', game.projectDesc.defaultSoundsVol);
		musicVol = game.settings.getItem('musicVol', game.projectDesc.defaultMusVol);
	}

	/// #if EDITOR
	static __resetSounds() {
		MusicFragment.__stopAll();
		for(let soundName in Lib.__soundsList) {

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
		if(Sound.isSoundsLockedByBrowser || (!game.isVisible // eslint-disable-line no-constant-condition
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
			setTimeout(() => {
				throw er;
			});
			return;
		}
		//*/

		if(s.lastPlayStartFrame < game.time
			/// #if EDITOR
			|| game.__EDITOR_mode
			/// #endif
		) {
			if(!multiInstanced && s.playing()) {
				s.stop();
			}
			volume = volume * Sound.soundsVol * Sound.soundsVol;
			if(volume > 0.01) {
				try {
					if(multiInstanced) {
						s.soundIdSaved = s.play();
						s.volume(volume, s.soundIdSaved);
						s.rate(rate, s.soundIdSaved);
						if(seek !== 0) {
							s.seek(seek, s.soundIdSaved);
						}
					} else {
						s.volume(volume);
						s.rate(rate);
						if(seek !== 0) {
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
				} catch(er) { } // eslint-disable-line no-empty
			}
		}
	}

	static playPitched(soundId: string, resetTimeout = 200, pitchStep = 1.0594630943592953, pitchLimit = 3) {
		let prevTime = pitchedPlayTimeouts[soundId];
		let d = game.time - prevTime;
		if(d < 2) {
			return;
		}

		let pitch;
		if(d < resetTimeout) {
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
		soundLockTimeoutId = setTimeout(blockedHanlder, 500);
		try {
			EMPTY_SOUND.play();
		} catch(er) {
			soundLockHandler(true);
		}
	}

	static _unlockSound() {
		if(Sound.isSoundsLockedByBrowser) {
			soundLockHandler(false);
		}
	}

	/// #if EDITOR
	static __stop() {
		if(game.__EDITOR_mode) {
			for(let soundName in Lib.__soundsList) {
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
	if(!isHandlerShootAlready) {
		game.loadingRemove(LOADING_OWNER_NAME);
		isHandlerShootAlready = true;
		if(soundLockTimeoutId) {
			clearTimeout(soundLockTimeoutId);
		}
	}
	if(!isLocked) {
		EMPTY_SOUND.off('playerror');
		EMPTY_SOUND.off('play');
		EMPTY_SOUND.unload();
		Sound.isSoundsLockedByBrowser = false;
		if(game.classes.BgMusic) {
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
	if(Sound.soundEnabled || Sound.musicEnabled) {
		game.settings.setItem('soundEnabled', Sound.soundEnabled);
		game.settings.setItem('musicEnabled', Sound.musicEnabled);
	}
}

let soundsVol: number;
let musicVol: number;

/// #if EDITOR
(Sound.play as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Sound.play as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return game.editor.chooseSound("Choose sound to play:");
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

interface SoundData {
	// visible file name which was selected to override sound
	name: string,
	// url encodes sound data.
	data: string
}

let sndDebugger: HTMLDivElement;
let sndDebuggerShowed = false;
function hideSndDebugger() {
	sndDebugger.style.display = 'none';
	sndDebuggerShowed = false;
}

function highlightPlayedSound(soundId: string) {
	if(sndDebuggerShowed) {
		let soundTitle: HTMLDivElement = document.querySelector('.sounds-debug-panel .snd-name-' + soundId)!;
		soundTitle.classList.remove('animate-sound-play');
		setTimeout(() => {
			soundTitle.classList.add('animate-sound-play');
		}, 5);
	}
}

function openIndexedDB(): IDBOpenDBRequest {
	//@ts-ignore 
	let indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB as IDBFactory;
	return indexedDB.open("MyDatabase", 1);
}

function getStoreIndexedDB(openDB: IDBOpenDBRequest) {
	const result = openDB.result;
	const tx = result.transaction("MyObjectStore", "readwrite");
	const store = tx.objectStore("MyObjectStore");
	return { result, tx, store };
}

function saveIndexedDB(filename: string, filedata?: SoundData) {
	let openDB = openIndexedDB();
	openDB.onsuccess = function () {
		let db = getStoreIndexedDB(openDB);
		db.store.put({ id: filename, data: filedata });
	};
	return true;
}

function loadIndexedDB(filename: string, callback: (res: SoundData) => void) {
	const openDB = openIndexedDB();

	openDB.onsuccess = function () {
		if(filename) {
			const db = getStoreIndexedDB(openDB);
			const getData = db.store.get(filename);
			getData.onsuccess = function () {
				callback(getData.result && getData.result.data);
			};
			db.tx.oncomplete = function () {
				db.result.close();
			};
		}
	};
	return true;
}

function showSndDebugger() {

	/// #if EDITOR
	return;
	/// #endif

	// sounds playing animation
	document.head.insertAdjacentHTML("beforeend", `<style>
	.animate-sound-play {
		animation: color-change 5s infinite;
	  }
	  
	  @keyframes color-change {
		0% { color: white; }
		1% { color: green; }
		100% { color: white; }
	  }
	   </style>`);

	if(!sndDebugger) { // eslint-disable-line no-unreachable
		sndDebugger = document.createElement('div');
		sndDebugger.style.position = "fixed";
		sndDebugger.style.right = "0";
		sndDebugger.style.zIndex = "10000";
		sndDebugger.style.color = "#ffffff";
		sndDebugger.style.background = "#000000";
		sndDebugger.style.padding = "5vh";
		sndDebugger.style.margin = "5vh";
		sndDebugger.style.maxHeight = "90vh";
		sndDebugger.style.overflowY = "auto";
		document.body.appendChild(sndDebugger);

		let libSounds = Lib.sounds;
		for(let sndName in libSounds) {
			loadIndexedDB(sndName, (data) => {
				if(data) {
					dataStore[sndName] = data;
					Lib.__overrideSound(sndName, data.data);
					showSndDebugger();
				}
			});
		}
	}

	sndDebuggerShowed = true; // eslint-disable-line no-unreachable
	sndDebugger.style.display = 'block';

	let soundNames: KeyedObject = {};

	let txt = ['<table class="sounds-debug-panel">'];
	let i = 0;
	let libSounds = Lib.__soundsList;
	for(let sndName in libSounds) {
		soundNames[i] = sndName;
		txt.push('<tr id="' + i + '-soundNum"><td><b style="cursor: pointer;" class="snd-name snd-name-' + sndName + '">' + sndName + '</b></td><td><input value="Загрузить..." style="width:90px;" type="file" accept="audio/x-wav" class="snd-override"/></td><td>');
		let overrideData = getOverrideData(sndName);
		if(overrideData) {
			txt.push(' ЗАГРУЖЕН (' + overrideData!.name + ')</td><td><button class="snd-clear">x</button>');
		} else {
			txt.push('-</td><td>-');
		}
		txt.push('</td></tr>');
		i++;
	}
	txt.push('</table>');
	sndDebugger.innerHTML = txt.join('');

	function sndNameByEvent(ev: InputEvent) {
		let t: HTMLElement | null = ev.target as HTMLElement;
		while(t) {
			if(t.id && t.id.indexOf('-soundNum') > 0) {
				return soundNames[parseInt(t.id)];
			}
			t = t.parentElement;
		}
	}

	for(let fileChooser of document.querySelectorAll('.snd-override') as any as HTMLInputElement[]) {  // eslint-disable-line no-unreachable

		fileChooser.addEventListener("change", function (ev: any) {
			let files = fileChooser.files!;

			let reader = new FileReader();
			reader.readAsDataURL(files[0]);
			reader.onloadend = function () {
				let sndName = sndNameByEvent(ev);
				let a = new Audio(this.result as string);
				a.play();
				setTimeout(() => {
					a.pause();
				}, 2000);
				Lib.__overrideSound(sndName, this.result as string);
				setOverrideData(
					sndName,
					{ name: ev.target.value, data: this.result as string }
				);
				showSndDebugger();
			};
		});
	}

	for(let a of document.querySelectorAll('.snd-name')) {  // eslint-disable-line no-unreachable
		a.addEventListener('click', (ev: any) => {
			let sndName = sndNameByEvent(ev);
			Sound.play(sndName);
			if(timeouts[sndName]) {
				clearTimeout(timeouts[sndName]);
				delete timeouts[sndName];
			}
			timeouts[sndName] = setTimeout(() => {
				Lib.getSound(sndName).stop();
			}, 2000);
		});
	}

	for(let clearBtn of document.querySelectorAll('.snd-clear')) {  // eslint-disable-line no-unreachable
		clearBtn.addEventListener('click', (ev) => {
			setOverrideData(sndNameByEvent(ev as InputEvent));
			showSndDebugger();
		});
	}
}

const timeouts: KeyedMap<number> = {};

window.addEventListener('keydown', (ev) => {
	if(ev.keyCode === 115) {
		if(sndDebuggerShowed) {
			hideSndDebugger();
			return;
		}
		showSndDebugger();
	}
});


let dataStore: KeyedMap<SoundData | undefined> = {};

function setOverrideData(sndName: string, data?: SoundData) {
	dataStore[sndName] = data;
	saveIndexedDB(sndName, data);
}

function getOverrideData(sndName: string) {
	return dataStore[sndName]!;
}
/// #endif
