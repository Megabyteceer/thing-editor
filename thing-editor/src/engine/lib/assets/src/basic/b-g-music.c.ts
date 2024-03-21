import { Container } from 'pixi.js';

import editable from 'thing-editor/src/editor/props-editor/editable';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import MusicFragment from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import Sound from 'thing-editor/src/engine/utils/sound';

const MIN_VOL_THRESHOLD = 0.0101; // howler has min threshold 0.01

const allActiveMusics: BgMusic[] = [];

let musicRecalculationIsScheduled = false;

export default class BgMusic extends Container {

	_externalVolume = 0;

	init() {
		this._externalVolume = 0;
		super.init();
		assert(allActiveMusics.indexOf(this) < 0, 'BgMusic reference already registered');
		allActiveMusics.push(this);

		BgMusic._recalculateMusic();
		if (!this.dynamicPreloading) {
			Lib.preloadSound(this.intro
				/// #if EDITOR
				, this
				/// #endif
			);
			Lib.preloadSound(this.loop
				/// #if EDITOR
				, this
				/// #endif
			);
		}
		this.applyResetPosition();
		BgMusic._recalculateMusic();
	}

	_intro: string | null = null;

	@editable({ type: 'sound', filterName: 'musSelector' })
	get intro() {
		return this._intro;
	}

	set intro(v) {
		if (this._intro !== v) {
			this._intro = v;
			this.musicFragmentHash = (this._intro || '') + '#' + (this._loop || '');
			BgMusic._recalculateMusic();
		}
	}

	_loop: string | null = null;

	@editable({ type: 'sound', filterName: 'musSelector' })
	get loop() {
		return this._loop;
	}

	set loop(v) {
		if (this._loop !== v) {
			this._loop = v;
			this.musicFragmentHash = (this._intro || '') + '#' + (this._loop || '');
			BgMusic._recalculateMusic();
		}
	}

	_isPlaying = true;

	@editable()
	get isPlaying() {
		return this._isPlaying;
	}

	set isPlaying(v) {
		if (this._isPlaying !== v) {
			this._isPlaying = v;
			BgMusic._recalculateMusic();
		}
	}

	@editable()
	resetPositionOnPlay = true;

	_volume = 1;

	@editable({ default: 1, min: 0, max: 1, step: 0.01 })
	get volume() {
		return this._volume;
	}

	set volume(v) {
		if (this._volume !== v) {
			this._volume = v;
			BgMusic._recalculateMusic();
		}
	}

	@editable({ type: 'data-path' })
	globalVolumePath: string | null = null;

	@editable({ min: 0, step: 0.01 })
	fadeOut = 0.2;

	@editable({ min: 0, step: 0.01 })
	fadeIn = 0.2;

	@editable({ min: 0, max: 1.0, step: 0.01 })
	volumeUnderModals = 0.25;

	@editable({ type: 'callback' })
	onIntroFinish: string | null = null;

	@editable()
	dynamicPreloading = false;

	@editable({ type: 'ref' })
	/// #if EDITOR
	get ___currentPos() {
		return (MusicFragment.___currentPos(this.musicFragmentHash) || 0).toFixed(3);
	}

	set ___currentPos(_val: string) {
		/* empty */
	}
	/// #endif

	musicFragmentHash!: string;
	customFade?: number;
	_appliedPathVol = 0;
	_cachedTargetVol!: number;

	onRemove() {
		super.onRemove();
		let i = allActiveMusics.indexOf(this);
		if (i >= 0) { // could be removed before initialization in parent init method
			allActiveMusics.splice(i, 1);
		}
		BgMusic._recalculateMusic();
		MusicFragment.onMusicRemove(this);
		this.musicFragmentHash = undefined as any;
		this._loop = null;
		this._intro = null;
		this._externalVolume = 0;
		this.customFade = undefined;
		this.onIntroFinish = null;
	}

	setVolume(v: number) {
		this.volume = v;
	}

	update() {
		super.update();
		if (this._isPlaying && this.globalVolumePath) {
			if (this._appliedPathVol !== getValueByPath(this.globalVolumePath, this)) {
				BgMusic._recalculateMusic();
			}
		}
	}

	applyResetPosition() {
		if (this.isPlaying && this.resetPositionOnPlay) {
			this.resetPosition();
		}
	}

	_getTargetVol() {
		if (!this._isPlaying) {
			return 0;
		}
		assert(!isNaN(this._volume * this._externalVolume * Sound.musicVol), 'MgMusic volume is invalid');
		let globalVolume;
		if (this.globalVolumePath) {
			this._appliedPathVol = getValueByPath(this.globalVolumePath, this);
			globalVolume = this._appliedPathVol;
		} else {
			globalVolume = Sound.musicVol;
		}

		return this._volume * this._externalVolume * globalVolume * globalVolume || 0;
	}

	play(fade?: number) {
		this.customFade = fade;
		if (!this.isPlaying) {
			this.isPlaying = true;
			this.applyResetPosition();
		}
	}

	stop(fade?: number) {
		this.customFade = fade;
		this.isPlaying = false;
	}

	_getFade(isFadeOut = false): number {
		return typeof this.customFade === 'number' ? this.customFade : (isFadeOut ? this.fadeOut : this.fadeIn);
	}

	resetPosition() {
		MusicFragment.resetPosition(this.musicFragmentHash);
	}

	_onIntroFinish() {
		if (this.onIntroFinish) {
			callByPath(this.onIntroFinish, this);
		}
	}

	static _recalculateMusic() {
		if (!musicRecalculationIsScheduled) {
			window.setTimeout(recalculateMusic, 1);
			musicRecalculationIsScheduled = true;
		}
	}

	static _clearCustomFades(fade: number) {
		for (let m of allActiveMusics) {
			m.customFade = fade;
		}
		MusicFragment._applyFadeForAll(fade);
	}

	set fade(val: number) { // transition from fade to fadeIn fadeOut
		this.fadeIn = val;
		this.fadeOut = val;
	}

	/// #if DEBUG
	static __onSoundOverride(name: string) {
		for (let bgm of game.currentContainer.findChildrenByType(BgMusic)) {
			if (bgm.isPlaying && (bgm.intro === name || bgm.loop === name)) {
				bgm.stop(0);
				MusicFragment.__stopAll();
				window.setTimeout(() => {
					if ((bgm.intro === name || bgm.loop === name)) {
						bgm.play();
					}
				}, 60);
			}
		}
	}

	/// #endif

	/// #if EDITOR
	static get __allActiveMusics() {
		return allActiveMusics;
	}

	__getVolume() {
		return this.__currentFragment && this.__currentFragment.volume();
	}

	get __isLoopPos() {
		return MusicFragment.__isLoopPosition(this.musicFragmentHash);
	}

	get __currentFragment() {
		if (this._getTargetVol() > MIN_VOL_THRESHOLD) {
			return MusicFragment.__getFragment(this.musicFragmentHash);
		}
		return undefined;
	}
	/// #endif
}


const FADER_MUSIC_PRIORITY = 1000000;
const CURRENT_CONTAINER_MUSIC_PRIORITY = 100000;

function recalculateMusic() {

	musicRecalculationIsScheduled = false;

	/// #if EDITOR
	if (!game.projectDesc) {
		return;
	}
	/// #endif

	if (game._isWaitingToHideFader) {
		return;
	}
	let priorities = [];
	let musicsMap: Map<number, BgMusic[]> = new Map();

	let currentFader = game.currentFader;

	if (currentFader) { //to enforce mute all musics under fader
		musicsMap.set(FADER_MUSIC_PRIORITY, []);
		priorities.push(FADER_MUSIC_PRIORITY);
	}

	for (let m of allActiveMusics) {
		let root = m.getRootContainer();
		let priority;
		if (root === game.currentContainer) {
			priority = CURRENT_CONTAINER_MUSIC_PRIORITY;
		} else if (root === currentFader) {
			priority = FADER_MUSIC_PRIORITY;
		} else if (root.parent) {
			priority = root.parent.getChildIndex(root);
		} else {
			m._externalVolume = 0;
			continue;
		}
		if (!musicsMap.has(priority)) {
			priorities.push(priority);
			musicsMap.set(priority, []);
		}
		musicsMap.get(priority)!.push(m);
	}

	priorities.sort(sortReverted);
	let muteAllNext = Sound.isSoundsLockedByBrowser || (game._loadingErrorIsDisplayed || (!game.isVisible
		/// #if EDITOR
		&& false
		/// #endif
	));

	/// #if EDITOR
	muteAllNext = muteAllNext || game.__EDITOR_mode;
	/// #endif
	for (let priority of priorities) {
		let a = musicsMap.get(priority)!;
		for (let m of a) {
			if (muteAllNext) {
				m._externalVolume = 0;
			} else if (priority < CURRENT_CONTAINER_MUSIC_PRIORITY) {
				m._externalVolume = m.volumeUnderModals;
			} else {
				m._externalVolume = 1;
			}
		}
		muteAllNext = true;
	}

	let playingFragments = [];

	for (let m of allActiveMusics) {
		let vol = m._getTargetVol();
		if ((vol >= MIN_VOL_THRESHOLD) && (m._loop || m._intro)) {
			m._cachedTargetVol = vol;
			playingFragments.push(m);
		}
	}
	MusicFragment.setPlayingBGMusics(playingFragments);
}

const sortReverted = (a: number, b: number) => {
	return b - a;
};

/// #if EDITOR

BgMusic.__EDITOR_icon = 'tree/music';

(BgMusic.prototype.play as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(BgMusic.prototype.stop as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

/// #endif
