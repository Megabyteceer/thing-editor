import { Container } from 'pixi.js';

import editable from 'thing-editor/src/editor/props-editor/editable';
import type { SelectEditorItem } from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import MusicFragment, { MIN_VOL_THRESHOLD } from 'thing-editor/src/engine/lib/assets/src/basic/b-g-music/music-fragment';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import Sound from 'thing-editor/src/engine/utils/sound';

const allActiveMusics: BgMusic[] = [];

let musicRecalculationIsScheduled = false;

/// #if EDITOR
const selectOutput = () => {
	const ret = Object.keys(Sound.outputs).map(name => { return {name, value: name} as SelectEditorItem; });
	ret.unshift({name: 'default (MUSIC)', value: null});
	ret.forEach(i => {
		if (i.name === 'Sound.soundsVol') {
		 i.name += ' (FX)';
		}
	});
	return ret;
};
/// #endif

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

	@editable({ type: 'data-path', select: selectOutput})
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

	musicFragmentHash!: string;
	_fade?: number = undefined;
	_appliedPathVol = 0;

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
		this._fade = undefined;
		this.onIntroFinish = null;
	}

	setVolume(v: number) {
		this.volume = v;
	}

	/// #if EDITOR
	update() {
		super.update();
		if (this._isPlaying) {
			if (this.intro) {
				Lib.getSound(this.intro).__lastTouch = EDITOR_FLAGS.__touchTime;
			}
			if (this.loop) {
				Lib.getSound(this.loop).__lastTouch = EDITOR_FLAGS.__touchTime;
			}
		}
	}
	/// #endif

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
		return this._volume * this._externalVolume || 0;
	}

	play(fade = this.fadeIn) {
		if (!this.isPlaying) {
			this._fade = fade;
			this.isPlaying = true;
			this.applyResetPosition();
		}
	}

	stop(fade = this.fadeOut) {
		if (this.isPlaying) {
			this._fade = fade;
			this.isPlaying = false;
		}
	}

	resetPosition() {
		MusicFragment.resetPosition(this.musicFragmentHash);
	}

	_onIntroFinish() {
		if (this.onIntroFinish) {
			callByPath(this.onIntroFinish, this);
		}
	}

	_takeFade() {
		if (typeof(this._fade) === 'number') {
			const ret = this._fade;
			this._fade = undefined;
			return ret;
		}
		return 0.2;
	}

	static _recalculateMusic() {
		if (!musicRecalculationIsScheduled) {
			window.setTimeout(recalculateMusic, 1);
			musicRecalculationIsScheduled = true;
		}
	}

	set fade(val: number) { // transition from fade to fadeIn fadeOut
		this.fadeIn = val;
		this.fadeOut = val;
	}

	/// #if DEBUG
	static __onSoundOverride(name: string) {
		if (!game.currentContainer) {
			return;
		}
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
	let muteAllNext = Sound.isSoundsLockedByBrowser || game._loadingErrorIsDisplayed;

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
			playingFragments.push(m);
		}
	}
	MusicFragment.setPlayingBGMusics(playingFragments);
}

const sortReverted = (a: number, b: number) => {
	return b - a;
};

/// #if DEBUG
game.on('__sound-overridden', BgMusic.__onSoundOverride);
/// #endif

/// #if EDITOR

BgMusic.__EDITOR_icon = 'tree/music';

(BgMusic.prototype.play as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(BgMusic.prototype.stop as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

/// #endif
