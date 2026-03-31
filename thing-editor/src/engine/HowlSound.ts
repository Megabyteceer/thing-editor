import game from 'thing-editor/src/engine/game';
import EDITOR_FLAGS from '../editor/utils/flags';
import { rootAudioContext, slideAudioParamTo } from './utils/slide-audio-param-to';

const volumeNodes = new Map<number, GainNode>();

export default class HowlSound {

	/// #if DEBUG
	__isEmptySound = false;
	/// #endif

	audioBuffer!: AudioBuffer;
	source?: AudioBufferSourceNode;
	volumeNode?: GainNode;
	src: string;

	attempt = 0;

	loadingStarted = false;

	constructor(src: string) {
		this.src = src;
		this.onEnded = this.onEnded.bind(this);
		/// #if EDITOR
		if (game.editor?.buildProjectAndExit) {
			return;
		}
		/// #endif
		this.load();
	}

	load () {
		this.loadingStarted = true;
		game.loadingAdd(this);
		fetch(this.src)
			.then(res => res.arrayBuffer())
			.then((buff) => {
				rootAudioContext.decodeAudioData(buff).then((audioBuffer) => {
					this.audioBuffer = audioBuffer;
					/// #if EDITOR
					if (!this.preciseDuration) {
						this.preciseDuration = audioBuffer.duration;
					}
					/// #endif
					game.classes?.BgMusic?._recalculateMusic();
					game.loadingRemove(this);
				}).catch(() => {
					game.loadingRemove(this);
				});
			}).catch(() => {
				if (this.attempt < 3 && !game._loadingErrorIsDisplayed) {
					this.attempt++;
					window.setTimeout(() => {
						this.load();
					}, this.attempt * 1000);
				}
				game.loadingRemove(this);
			});
	}

	stop() {
		if (this.source) {
			this.source.stop();
			this.source.disconnect();
			this.source = undefined;
		}
	}

	onEnded() {
		this.source?.removeEventListener('ended', this.onEnded);
		this.source = undefined;
	}

	play(volume = 1, rate = 1, seek = 0, outNode: AudioNode = game.Sound.outputs.FX) {
		if (volume < 0.001 || !this.audioBuffer) {
			return;
		}
		if (this.source) {
			this.source.removeEventListener('ended', this.onEnded);
		}
		this.source = rootAudioContext.createBufferSource();
		this.source.addEventListener('ended', this.onEnded);
		this.source.buffer = this.audioBuffer;

		/// #if EDITOR
		this.__lastTouch = EDITOR_FLAGS.__touchTime;
		/// #endif

		if (volume !== 1) {
			volume = Math.round(volume * 1000) / 1000;
			if (!volumeNodes.has(volume)) {
				const volumeNode = rootAudioContext.createGain();
				volumeNode.connect(outNode);
				slideAudioParamTo(volumeNode.gain, volume);
				volumeNodes.set(volume, volumeNode);
			}
			this.source.connect(volumeNodes.get(volume)!);
		} else {
			this.source.connect(outNode);
		}
		if (this.source.playbackRate.value !== rate) {
			slideAudioParamTo(this.source.playbackRate, volume);
		}
		this.source.start(0, seek);
	}

	/// #if EDITOR
	__lastTouch = 0;
	/// #endif

	unload() {
		if (this.source) {
			this.source.disconnect();
			this.source = null!;
			if (this.volumeNode) {
				this.volumeNode.disconnect();
				this.volumeNode = null!;
			}
		}
	}

	lastPlayStartFrame = 0;

	preciseDuration = 0;
}
