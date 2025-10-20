import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import { rootAudioContext } from 'thing-editor/src/engine/HowlSound';
import Lib from 'thing-editor/src/engine/lib';
import type BgMusic from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music.c';
import Sound from 'thing-editor/src/engine/utils/sound';

export const MIN_VOL_THRESHOLD = 0.001;

const FADE_INTERVAL = 40;

const allFragments: KeyedMap<MusicFragment> = {};

const allActiveFragments: KeyedMap<MusicFragment> = {};


window.setInterval(() => {
	for (let h in allActiveFragments) {
		allActiveFragments[h]._updateFading();
	}
}, FADE_INTERVAL);

export default class MusicFragment {

	volumeNode = rootAudioContext.createGain();
	fadingToVolume = 0;
	intro: string | null;
	loop: string | null;
	musicFragmentHash!: string;
	source?: AudioBufferSourceNode;
	_fadeToVol!: number;
	_fadeSpeed!: number;
	owners: Set<BgMusic> = new Set();

	constructor(bgMusic: BgMusic) {
		this.volumeNode.connect(Sound.outputs.MUSIC);

		if (bgMusic.dynamicPreloading) {
			bgMusic.loop && Lib.preloadSound(bgMusic.loop
				/// #if EDITOR
				, bgMusic
				/// #endif
			);
			bgMusic.intro && Lib.preloadSound(bgMusic.intro
				/// #if EDITOR
				, bgMusic
				/// #endif
			);
		}
		this.onIntroEnd = this.onIntroEnd.bind(this);
		this.intro = bgMusic.intro;
		this.loop = bgMusic.loop;
		this.musicFragmentHash = bgMusic.musicFragmentHash;
	}

	_updateFading() {
		assert(this.source, 'MusicFragment wrongly registered as active');
		let curVol = this._fadeToVol;
		if (curVol !== this.fadingToVolume) {
			this.fadingToVolume = curVol;
			this.volumeNode.gain.setTargetAtTime(curVol, rootAudioContext.currentTime, this._fadeSpeed);
		}
	}

	getVolume() {
		assert(this.source, 'BgMusic component is not paying to getVolume.');
		return this.volumeNode.gain.value;
	}

	static onMusicRemove(bgMusic: BgMusic) {
		for (let h in allActiveFragments) {
			let f = allActiveFragments[h];
			if (f.owners.has(bgMusic)) {
				clearFragmentsOwner(f, bgMusic);
			}
		}
	}

	static resetPosition(musicFragmentHash: string) {
		if (allFragments.hasOwnProperty(musicFragmentHash)) {
			allFragments[musicFragmentHash].resetPosition();
		}
	}

	resetPosition() {
		this._releaseCurrentFragment();
		this.startPlay();
	}

	startPlay() {

		if (this.source) {
			this.source.start();
		} else if (this.intro) {
			this.source = this._playMusicFragment(this.intro, 0, this._fadeToVol);
			if (this.source) {
				this.source!.loop = false;

				this.source!.addEventListener('ended', this.onIntroEnd);
			}
		} else if (this.loop) {
			this.source = this._playMusicFragment(this.loop);
			if (this.source) {
				this.source!.loop = true;
			}
		}
		assert(this.source || (!this.loop), 'Failed to play Music intro: ' + (this.intro || 'EMPTY') + '; loop: ' + (this.loop || 'EMPTY'));
	}

	onIntroEnd() {
		if (this.source) {
			let vol = this.getVolume();
			this._releaseCurrentFragment();
			this.source = this._playMusicFragment(this.loop, 0, vol);
			if (this.source) {
				this.source!.loop = true;
			}
		}

		this.owners.forEach((bgMusic) => {
			bgMusic._onIntroFinish();
		});
	}

	_playMusicFragment(s: string | null, pos = 0, startVol = 0.001) {
		if (s) {
			try {
				const snd = Lib.getSound(s, true);
				if (!snd.audioBuffer) {
					return;
				}

				const source = rootAudioContext.createBufferSource();
				source.buffer = snd.audioBuffer;
				source.playbackRate.setValueAtTime(
					/// #if DEBUG
					game.pixiApp.ticker.speed
					/*
				/// #endif
				1
				//*/
					, rootAudioContext.currentTime);

				Sound.__highlightPlayedSound(s);

				source.start(undefined, pos);

				/// #endif
				assert(!allActiveFragments[this.musicFragmentHash], 'Music fragment already exists');
				allActiveFragments[this.musicFragmentHash] = this;
				this.fadingToVolume = startVol;
				source!.connect(this.volumeNode);
				source.loopEnd = snd.preciseDuration;

				return source;
			} catch (_er) {
				/// #if EDITOR
				debugger;
				/// #endif
			}
		}
	}

	_releaseCurrentFragment() {
		if (this.source) {
			this.source.removeEventListener('ended', this.onIntroEnd);
			this.source.stop();
			assert(allActiveFragments[this.musicFragmentHash] === this, 'allActiveFragments map corrupted.');
			this.source = undefined;
			delete allActiveFragments[this.musicFragmentHash];
		}
	}

	static setPlayingBGMusics(bgMusics: BgMusic[]) {
		let hashesToPlay: KeyedMap<boolean> = {};
		for (let bgMusic of bgMusics) {
			let fragment: MusicFragment;

			hashesToPlay[bgMusic.musicFragmentHash] = true;

			if (!allFragments.hasOwnProperty(bgMusic.musicFragmentHash)) {
				fragment = new MusicFragment(bgMusic);
				allFragments[bgMusic.musicFragmentHash] = fragment;
			} else {
				fragment = allFragments[bgMusic.musicFragmentHash];
				assert(fragment.musicFragmentHash === bgMusic.musicFragmentHash, 'allFragments map corrupted');
			}


			fragment._fadeToVol = bgMusic._getTargetVol();
			fragment._fadeSpeed = bgMusic._getFade(fragment._fadeToVol < MIN_VOL_THRESHOLD);
			fragment.owners.add(bgMusic);

			if (!allActiveFragments.hasOwnProperty(bgMusic.musicFragmentHash)) {
				fragment.startPlay();
			}
			assert(fragment.source, 'wrong music-fragment position');
		}

		for (let h in allActiveFragments) {
			if (!hashesToPlay.hasOwnProperty(h)) {
				allActiveFragments[h]._fadeToVol = 0;
				if (allActiveFragments[h].owners.size) {
					allActiveFragments[h].owners.forEach((bgMusic) => {
						clearFragmentsOwner(allActiveFragments[h], bgMusic);
					});
				}
			}
		}
	}

	static __applyGameSpeed(rate: number) {
		for (let h in allActiveFragments) {
			let f = allActiveFragments[h];
			if (f.source) {
				f.source.playbackRate.setValueAtTime(rate, rootAudioContext.currentTime);
			}
		}
	}
	/// #if EDITOR

	static __isLoopPosition(musicFragmentHash: string) {
		return allActiveFragments[musicFragmentHash]?.source?.loop;
	}

	static ___currentPos(musicFragmentHash: string) {
		let f = MusicFragment.__getFragment(musicFragmentHash);
		return 0;
	}

	static __getFragment(musicFragmentHash: string) {
		return allActiveFragments[musicFragmentHash];
	}
	/// #endif

	/// #if DEBUG
	static __stopAll() {
		for (let h in allActiveFragments) {
			MusicFragment.resetPosition(h);
			allActiveFragments[h]._releaseCurrentFragment();
		}
	}
	/// #endif

}


function clearFragmentsOwner(fragment: MusicFragment, ownerBgMusic:BgMusic) {
	ownerBgMusic.customFade = undefined;
	fragment._fadeSpeed = ownerBgMusic._getFade(true);

	fragment.owners.delete(ownerBgMusic);
	if (!fragment.owners.size) {
		if (fragment.source) {
			fragment.source.removeEventListener('ended', fragment.onIntroEnd);
		}
	}
}
