
/// #if EDITOR
import { Howl, HowlOptions } from 'howler';
/*
/// #endif
import 'howler.js';
//*/
interface HowlSoundOptions extends HowlOptions {

}

export default class HowlSound extends Howl {

	loadedWithError = false;
	lastPlayStartFrame = 0;

	soundIdSaved?: number;

	hackDuration(duration: number) {
		// hack percise duration
		//@ts-ignore
		assert(typeof this._duration === 'number', 'Howler _duration property moved.');
		//@ts-ignore
		assert(Math.abs(this._duration - duration) < 0.1, "Sound duration detection error. Sounds are too different: " + s._src);
		//@ts-ignore
		this._duration = duration;
		//@ts-ignore
		this._sprite.__default[1] = duration * 1000;

	}
}

export type { HowlSoundOptions };
