import type HowlSound from 'thing-editor/src/engine/HowlSound';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type BgMusic from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music.c';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

const MIN_VOL_THRESHOLD = 0.0101; // howler has min threshold 0.01

const FADE_INTERVAL = 40;
const FADE_STEP = 1.0 / FADE_INTERVAL;

const allFragments: KeyedMap<MusicFragment> = {};

const allActiveFragments: KeyedMap<MusicFragment> = {};

/// #if EDITOR
let __ownersValidationId = 0;
/// #endif


window.setInterval(() => {
	for (let h in allActiveFragments) {
		allActiveFragments[h]._updateFading();
	}
}, FADE_INTERVAL);

export default class MusicFragment {


	intro: string | null;
	loop: string | null;
	musicFragmentHash: string | undefined;
	_currentFragment!: HowlSound | undefined;
	_fadeToVol!: number;
	_fadeSpeed!: number;
	owner?: BgMusic;

	__fragmentOwnerId = 0;

	introPos = 0;
	loopPos = 0;
	isLoopPos = false;

	constructor(bgMusic: BgMusic) {
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
		assert(this._currentFragment, 'MusicFragment wrongly registered as active');
		let curVol = this.getVolume();
		if (this._fadeToVol !== curVol) {
			curVol = stepTo(curVol, this._fadeToVol, 1 / (this._fadeSpeed + 0.0001) * FADE_STEP);

			if (curVol < MIN_VOL_THRESHOLD && this._fadeToVol < MIN_VOL_THRESHOLD) {
				this._releaseCurrentFragment();
			} else {
				this._currentFragment!.volume(curVol);
			}
		}
	}

	getVolume() {
		assert(this._currentFragment, 'BgMusic component is not paying to getVolume.');
		if (this._currentFragment) {
			assert((this._currentFragment as any)._sounds && (this._currentFragment as any)._sounds[0] && !isNaN((this._currentFragment as any)._sounds[0]._volume), 'BgMusic component is not paying to getVolume.');
			return (this._currentFragment as any)._sounds[0]._volume;
		}
		return 0;
	}

	static onMusicRemove(bgMusic: BgMusic) {
		for (let h in allActiveFragments) {
			let f = allActiveFragments[h];
			if (f.owner === bgMusic) {
				clearFragmentsOwner(f);
			}
		}
	}

	static resetPosition(musicFragmentHash: string) {
		if (allFragments.hasOwnProperty(musicFragmentHash)) {
			allFragments[musicFragmentHash].resetPosition();
		}
	}

	resetPosition() {
		let restorePlaying;
		if (this._currentFragment) {
			this._releaseCurrentFragment();
			restorePlaying = true;
		}
		this.introPos = 0;
		this.loopPos = 0;
		this.isLoopPos = false;
		if (restorePlaying) {
			this.startPlay();
		}
	}

	startPlay() {

		if (this.intro && !this.isLoopPos) {
			this._playMusicFragment(this.intro, this.introPos, this._fadeToVol);
			if (this._currentFragment) {
				this._currentFragment.loop(false);
				this._currentFragment.on('end', this.onIntroEnd);
			}
		} else if (this.loop) {
			this.isLoopPos = true;
			this._playMusicFragment(this.loop, this.loopPos);
			if (this._currentFragment) {
				this._currentFragment.loop(true);
			}
		}
		assert(this._currentFragment || (!this.loop && this.isLoopPos), 'Failed to play Music intro: ' + (this.intro || 'EMPTY') + '; loop: ' + (this.loop || 'EMPTY'));
	}

	onIntroEnd() {
		if (this._currentFragment) {
			let vol = this.getVolume();
			this._releaseCurrentFragment();
			this._playMusicFragment(this.loop, 0, vol);
			this.isLoopPos = true;
			if (this._currentFragment) {
				this._currentFragment.loop(true);
			}
		}
		if (this.owner) {
			/// #if EDITOR
			assert(this.owner.__nodeExtendData.__fragmentOwnerId === this.__fragmentOwnerId, 'fragment refers to outdated owner.', 90001);
			/// #endif
			this.owner._onIntroFinish();
		}
	}

	_playMusicFragment(s: string | null, pos = 0, startVol = MIN_VOL_THRESHOLD) {
		assert(!this._currentFragment, 'MusicFragment already playing.');

		if (s) {
			try {
				const snd = Lib.getSound(s, true);
				snd.volume(startVol);
				/// #if DEBUG
				snd.rate(game.pixiApp.ticker.speed);
				/// #endif
				snd.seek(pos);
				snd.soundIdSaved = snd.play(snd.soundIdSaved);

				this._currentFragment = snd;
				assert((snd as any)._sounds.length === 1, 'Music started in more that one instance.');
				allActiveFragments[this.musicFragmentHash!] = this;
			} catch (_er) { }
		}
	}

	_releaseCurrentFragment() {
		if (this._currentFragment) {
			this._currentFragment.off('end', this.onIntroEnd);
			if (this.isLoopPos) {
				this.loopPos = this._currentFragment.seek();
			} else {
				this.introPos = this._currentFragment.seek();
			}
			this._currentFragment.stop();

			this._currentFragment = undefined;
			delete allActiveFragments[this.musicFragmentHash!];
		}
	}

	static _applyFadeForAll(fade: number) {
		for (let h in allActiveFragments) {
			allActiveFragments[h]._fadeSpeed = fade;
		}
	}

	static setPlayingBGMusics(bgMusics: BgMusic[]) {
		let hashesToPlay: KeyedMap<boolean> = {};
		for (let f of bgMusics) {
			let fragment: MusicFragment;

			hashesToPlay[f.musicFragmentHash] = true;

			if (!allFragments.hasOwnProperty(f.musicFragmentHash)) {
				fragment = new MusicFragment(f);
				allFragments[f.musicFragmentHash] = fragment;
			} else {
				fragment = allFragments[f.musicFragmentHash];
			}

			fragment._fadeToVol = f._cachedTargetVol;
			fragment._fadeSpeed = f._getFade(fragment._fadeToVol < MIN_VOL_THRESHOLD);
			fragment.owner = f;
			/// #if EDITOR
			f.__nodeExtendData.__fragmentOwnerId = __ownersValidationId;
			fragment.__fragmentOwnerId = __ownersValidationId;
			__ownersValidationId++;
			/// #endif
			if (!allActiveFragments.hasOwnProperty(f.musicFragmentHash)) {
				fragment.startPlay();
			}
			assert(fragment._currentFragment || (!fragment.loop && fragment.isLoopPos), 'wrong music-fragment position');
		}

		for (let h in allActiveFragments) {
			if (!hashesToPlay.hasOwnProperty(h)) {
				allActiveFragments[h]._fadeToVol = 0;
				if (allActiveFragments[h].owner) {
					clearFragmentsOwner(allActiveFragments[h]);
				}
			}
		}
	}

	static __applyGameSpeed(rate: number) {
		for (let h in allActiveFragments) {
			let f = allActiveFragments[h];
			if (f._currentFragment) {
				f._currentFragment.rate(rate);
			}
		}
	}
	/// #if EDITOR

	static __isLoopPosition(musicFragmentHash: string) {
		let f = allActiveFragments[musicFragmentHash];
		return f && f.isLoopPos;
	}

	static ___currentPos(musicFragmentHash: string) {
		let f = MusicFragment.__getFragment(musicFragmentHash);
		return f ? f.seek() : 0;
	}

	static __getFragment(musicFragmentHash: string) {
		if (allActiveFragments[musicFragmentHash]) {
			return allActiveFragments[musicFragmentHash]._currentFragment;
		}
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


function clearFragmentsOwner(fragment: MusicFragment) {
	fragment._fadeSpeed = fragment.owner!._getFade(true);
	fragment.owner!.customFade = undefined;
	fragment.owner = undefined;
}
