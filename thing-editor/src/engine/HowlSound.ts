
/// #if EDITOR
import { Howl, HowlOptions } from 'howler';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
/*
/// #endif
import 'howler.js';
//*/

type HowlSoundOptions = HowlOptions

export default class HowlSound extends Howl {

	play(spriteOrId?: string | number): number {
		if(!game.editor.settings.getItem('sound-muted') || game.__EDITOR_mode) {
			return super.play(spriteOrId);
		}
		return undefined!;
	}

	loadedWithError = false;
	lastPlayStartFrame = 0;

	soundIdSaved?: number;

	hackDuration(duration: number) {
		// hack percise duration

		assert(typeof (this as any)._duration === 'number', 'Howler _duration property moved.');

		assert(Math.abs((this as any)._duration - duration) < 0.1, "Sound duration detection error. Sounds are too different: " + (this as any)._src);

		(this as any)._duration = duration;

		(this as any)._sprite.__default[1] = duration * 1000;

	}
}

export type { HowlSoundOptions };
