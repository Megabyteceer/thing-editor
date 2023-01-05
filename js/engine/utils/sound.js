import game from "../game.js";
import Lib from "../lib.js";
import BgMusic from "../components/bg-music.js";
import MusicFragment from "./music-fragment.js";

const MIN_VOL_THRESHOLD = 0.005;
const MIN_VOL_ENABLE = 0.05;


function normalizeVolForEnabling(vol, defaultVol) {
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

	static setSoundsVol(v) {
		Sound.soundsVol = v;
	}

	static set soundsVol(v) {
		assert(!isNaN(v), "invalid value for 'soundsVol'. Valid number value expected.", 10001);
		v = Math.max(0, Math.min(1, v));
		soundsVol = v;
		game.settings.setItem('soundsVol', soundsVol);
	}

	static get musicVol() {
		return musicVol;
	}

	static setMusicVol(v) {
		Sound.musicVol = v;
	}

	static set musicVol(v) {
		assert(!isNaN(v), "invalid value for 'musicVol'. Valid number value expected.", 10001);
		v = Math.max(0, Math.min(1, v));
		if(musicVol !== v) {
			BgMusic._clearCustomFades(0.2);
		}
		musicVol = v;
		game.settings.setItem('musicVol', musicVol);
		BgMusic._recalculateMusic();
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
			BgMusic._clearCustomFades(0.2);

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
		for(let s of Lib.__soundsList) {
			let snd = Lib.getSound(s.name);
			snd.off('fade');
			snd.stop();
			snd.lastPlayStartFrame = 0;
		}
		pitches = {};
		pitchTimeouts = {};
	}
	/// #endif
	/**
	 * 
	 * @param {string} soundId - name of sound in Sounds list
	 * @param {number} volume 
	 * @param {number} rate - pitch (1 - default);
	 * @param {number} seek - start position in seconds
	 * @param {boolean} multiInstanced - do not stop previous sound with same id
	 */
	static play(soundId, volume = 1.0, rate = 1.0, seek = 0.0, multiInstanced = false) {
		/// #if DEBUG
		rate = rate * game.__speedMultiplier;
		/// #endif
		if(Sound.isSoundsLockedByBrowser || (!game.isFocused // eslint-disable-line no-constant-condition
			/// #if EDITOR
			&& false
			/// #endif
			&& game.projectDesc.muteOnFocusLost)) {
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
			volume = volume * Sound.soundsVol;
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
					editor.ui.soundsList.soundPlayProfile(soundId, volume, rate, seek, multiInstanced);
					/// #endif
				} catch(er) { } // eslint-disable-line no-empty
			}
		}
	}

	static playPitched(soundId, resetTimeout = 200, pitchStep = 1.0594630943592953, pitchLimit = 3) {
		let prevTime = pitchTimeouts[soundId];
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
		pitchTimeouts[soundId] = game.time;
		Sound.play(soundId, 1, pitch, 0, true);
	}

	static checkSoundLockByBrowser() {
		Sound.isSoundsLockedByBrowser = true;
		game.additionalLoadingsInProgress++;
		EMPTY_SOUND = new Howl({src: 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU2LjM2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU2LjQxAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//MUZAAAAAGkAAAAAAAAA0gAAAAATEFN//MUZAMAAAGkAAAAAAAAA0gAAAAARTMu//MUZAYAAAGkAAAAAAAAA0gAAAAAOTku//MUZAkAAAGkAAAAAAAAA0gAAAAANVVV'});
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
			for(let s of Lib.__soundsList) {
				Lib.getSound(s.name).stop();
			}
		}
	}
	/// #endif
}

let EMPTY_SOUND;
let soundLockTimeoutId;
let isHandlerShootAlready;
const soundLockHandler = (isLocked) => {
	if(!isHandlerShootAlready) {
		game.additionalLoadingsInProgress--;
		isHandlerShootAlready = true;
		clearTimeout(soundLockTimeoutId);
	}
	if(!isLocked) {
		EMPTY_SOUND.off('playerror');
		EMPTY_SOUND.off('play');
		EMPTY_SOUND.unload();
		Sound.isSoundsLockedByBrowser = false;
		if(game.classes.BgMusic) {
			game.classes.BgMusic._recalculateMusic();
		}
	}
};

let pitches = {};
let pitchTimeouts = {};

let enablingSaveTimeout;
function _rememberEnablings() {
	enablingSaveTimeout = null;
	if(Sound.soundEnabled || Sound.musicEnabled) {
		game.settings.setItem('soundEnabled', Sound.soundEnabled);
		game.settings.setItem('musicEnabled', Sound.musicEnabled);
	}
}

let soundsVol;
let musicVol;

/// #if EDITOR
Sound.play.___EDITOR_isGoodForChooser = true;
Sound.playPitched.___EDITOR_isGoodForChooser = true;
Sound.setSoundsVol.___EDITOR_isGoodForChooser = true;
Sound.setMusicVol.___EDITOR_isGoodForChooser = true;
Sound.toggleMusic.___EDITOR_isGoodForChooser = true;
Sound.toggleSounds.___EDITOR_isGoodForChooser = true;
Sound.toggleFullSound.___EDITOR_isGoodForChooser = true;
Sound.___EDITOR_isGoodForChooser = true;
Sound.init.___EDITOR_isHiddenForChooser = true;

/// #endif

/// #if DEBUG
let sndDebugger;
let sndDebuggerShowed;
function hideSndDebugger() {
	sndDebugger.style.display = 'none';
	sndDebuggerShowed = false;
}

function highlightPlayedSound(soundId) {
	if(sndDebuggerShowed) {
		let soundTitle = document.querySelector('.sounds-debug-panel .snd-name-' + soundId);
		soundTitle.classList.remove('animate-sound-play');
		setTimeout(() => {
			soundTitle.classList.add('animate-sound-play');
		}, 5);
	}
}

function openIndexedDB() {
	// This works on all devices/browsers, and uses IndexedDBShim as a final fallback 
	var indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB || window.shimIndexedDB;

	var openDB = indexedDB.open("MyDatabase", 1);

	openDB.onupgradeneeded = function () {
		var db = {};
		db.result = openDB.result;
		db.store = db.result.createObjectStore("MyObjectStore", {keyPath: "id"});
	};

	return openDB;
}

function getStoreIndexedDB(openDB) {
	var db = {};
	db.result = openDB.result;
	db.tx = db.result.transaction("MyObjectStore", "readwrite");
	db.store = db.tx.objectStore("MyObjectStore");
	return db;
}

function saveIndexedDB(filename, filedata) {
	var openDB = openIndexedDB();
	openDB.onsuccess = function () {
		var db = getStoreIndexedDB(openDB);

		db.store.put({id: filename, data: filedata});
	};
	return true;
}


function loadIndexedDB(filename, callback) {
	var openDB = openIndexedDB();

	openDB.onsuccess = function () {
		var db = getStoreIndexedDB(openDB);

		var getData;
		if(filename) {
			getData = db.store.get(filename);


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

		let libSounds = Lib.__getSoundsData();
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

	let soundNames = {};

	let txt = ['<table class="sounds-debug-panel">'];
	let i = 0;
	let libSounds = Lib.__getSoundsData();
	for(let sndName in libSounds) {
		soundNames[i] = sndName;
		txt.push('<tr id="' + i + '-soundNum"><td><b style="cursor: pointer;" class="snd-name snd-name-' + sndName + '">' + sndName + '</b></td><td><input value="Загрузить..." style="width:90px;" type="file" accept="audio/x-wav" class="snd-override"/></td><td>');
		let overrideData = getOverrideData(sndName);
		if(overrideData) {
			txt.push(' ЗАГРУЖЕН (' + overrideData.name + ')</td><td><button class="snd-clear">x</button>');
		} else {
			txt.push('-</td><td>-');
		}
		txt.push('</td></tr>');
		i++;
	}
	txt.push('</table>');
	sndDebugger.innerHTML = txt.join('');

	function sndNameByEvent(ev) {
		let t = ev.target;
		while(t) {
			if(t.id && t.id.indexOf('-soundNum') > 0) {
				return soundNames[parseInt(t.id)];
			}
			t = t.parentElement;
		}
	}

	for(let fileChooser of document.querySelectorAll('.snd-override')) {  // eslint-disable-line no-unreachable

		fileChooser.addEventListener("change", function (ev) {
			var files = fileChooser.files;


			var reader = new FileReader();
			reader.readAsDataURL(files[0]);
			reader.onloadend = function () {
				let sndName = sndNameByEvent(ev);
				var a = new Audio(this.result);
				a.play();
				setTimeout(() => {
					a.pause();
				}, 2000);
				Lib.__overrideSound(sndName, this.result);
				setOverrideData(
					sndName,
					{name: ev.target.value, data: this.result}
				);
				showSndDebugger();
			};
		});
	}

	for(let a of document.querySelectorAll('.snd-name')) {  // eslint-disable-line no-unreachable
		a.addEventListener('click', (ev) => {
			let sndName = sndNameByEvent(ev);
			Sound.play(sndName);
			clearTimeout(timeouts[sndName]);
			timeouts[sndName] = setTimeout(() => {
				Lib.getSound(sndName).stop();
			}, 2000);
		});
	}

	for(let clearBtn of document.querySelectorAll('.snd-clear')) {  // eslint-disable-line no-unreachable
		clearBtn.addEventListener('click', (ev) => {
			setOverrideData(sndNameByEvent(ev));
			showSndDebugger();
		});
	}

}

const timeouts = {};

window.addEventListener('keydown', (ev) => {
	if(ev.keyCode === 115) {
		if(sndDebuggerShowed) {
			hideSndDebugger();
			return;
		}
		showSndDebugger();
	}
});


let dataStore = {};

function setOverrideData(sndName, data) {
	dataStore[sndName] = data;
	saveIndexedDB(sndName, data);
}

function getOverrideData(sndName) {
	return dataStore[sndName];
}
/// #endif