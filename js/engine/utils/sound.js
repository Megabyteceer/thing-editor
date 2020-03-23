import game from "../game.js";
import Lib from "../lib.js";
import BgMusic from "../components/bg-music.js";

const MIN_VOL_THRESHOLD = 0.005;
const MIN_VOL_ENABLE = 0.05;

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
			let minMusEnablingVolume = Math.max(MIN_VOL_ENABLE, musicVol);
			if(val) {
				Sound.musicVol = game.settings.getItem('musicVolEnabling', minMusEnablingVolume);
			} else {
				game.settings.setItem('musicVolEnabling', minMusEnablingVolume);
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
			let minSndEnablingVolume = Math.max(MIN_VOL_ENABLE, soundsVol);
			
			if(val) {
				Sound.soundsVol = game.settings.getItem('soundsVolEnabling', minSndEnablingVolume);
			} else {
				game.settings.setItem('soundsVolEnabling', minSndEnablingVolume);
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
		soundsVol = game.settings.getItem('soundsVol', 1);
		musicVol = game.settings.getItem('musicVol', 0.7);
	}

	/// #if EDITOR
	static __resetSounds() {
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
	 */
	static play(soundId, volume = 1.0, rate = 1.0, seek = 0.0, multiInstanced = false) {
		/// #if DEBUG
		rate = rate * game.__speedMultiplier;
		/// #endif
		if(!game.isFocused // eslint-disable-line no-constant-condition
		/// #if EDITOR
			&& false
		/// #endif
		&& game.projectDesc.muteOnFocusLost) {
			return;
		}
		let s = Lib.getSound(soundId);
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
				s.volume(volume);
				s.rate(rate);
				if(seek !== 0) {
					s.seek(seek);
				}
				s.soundIdSaved = s.play(multiInstanced ? undefined : s.soundIdSaved);
				s.lastPlayStartFrame = game.time + 2;
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

let pitches = {};
let pitchTimeouts = {};

let enablingSaveTimeout;
function _rememberEnablings () {
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

function showSndDebugger() {

	if(!sndDebugger) {
		sndDebugger = document.createElement('div');
		sndDebugger.style.position="fixed";
		sndDebugger.style.right="0";
		sndDebugger.style.zIndex="10000";
		sndDebugger.style.color="#ffffff";
		sndDebugger.style.background="#000000";
		sndDebugger.style.padding = "5vh";
		sndDebugger.style.margin = "5vh";
		sndDebugger.style.maxHeight = "90vh";
		sndDebugger.style.overflowY = "auto";
		document.body.appendChild(sndDebugger);
	}
	sndDebuggerShowed = true;
	sndDebugger.style.display = 'block';
	
	let soundNames = {};

	let txt = ['<table>'];
	let i = 0;
	let libSounds = Lib.__getSoundsData();
	for(let sndName in libSounds) {
		soundNames[i] = sndName;
		txt.push('<tr><td><b>' + sndName + '</b></td><td><input value="Загрузить..." style="width:90px;" type="file" accept="audio/x-wav" class="snd-override" id="' + i + '-soundNum"/></td><td>');
		let overrideData = getOverrideData(sndName);
		if(overrideData) {
			txt.push(' ЗАГРУЖЕН (' + overrideData.name + ')</td><td><button class="snd-clear" id="' + i + '-soundNum">х</button>');
		} else {
			txt.push('-</td><td>-');
		}
		txt.push('</td></tr>');
		i++;
	}
	txt.push('</table>');
	sndDebugger.innerHTML = txt.join('');

	function sndNameByEvent(ev) {
		return soundNames[parseInt(ev.target.id)];
	}
	
	for(let fileChooser of document.querySelectorAll('.snd-override')) {

		fileChooser.addEventListener("change", function(ev) {
			var files = fileChooser.files;


			var reader = new FileReader();
			reader.readAsDataURL( files[0] );
			reader.onloadend = function() {
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

	for(let clearBtn of document.querySelectorAll('.snd-clear')) {
		clearBtn.addEventListener('click', (ev) => {
			setOverrideData(sndNameByEvent(ev));
			showSndDebugger();
		});
	}

}


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
	dataStore['__snd_override' + sndName] = data;
}

function getOverrideData(sndName) {
	return dataStore['__snd_override' + sndName];
}
/// #endif