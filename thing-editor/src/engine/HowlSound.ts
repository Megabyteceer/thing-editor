
/// #if EDITOR
import type { HowlOptions } from 'howler';
import { Howl } from 'howler';
/*
/// #endif
import 'howler.js';
//*/

import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

type HowlSoundOptions = HowlOptions

export default class HowlSound extends Howl {

	constructor(options: HowlOptions) {

		/// #if EDITOR
		if (game.editor.buildProjectAndExit) {
			options.preload = false;
		}
		/// #endif

		super(options);

		/// #if EDITOR
		if (game.editor.buildProjectAndExit) {
			return;
		}
		/// #endif

		game.loadingAdd(this);
		this.once('load', () => {
			game.loadingRemove(this);
			// hack precise duration
			if (this.preciseDuration) {
				assert(typeof (this as any)._duration === 'number', 'Howler _duration property moved.');
				assert(Math.abs((this as any)._duration - this.preciseDuration) < 0.1, 'Sound duration detection error. Sounds are too different: ' + (this as any)._src);
				(this as any)._duration = this.preciseDuration;
				(this as any)._sprite.__default[1] = this.preciseDuration * 1000;
			}
		});

		let attempt = 0;

		this.on('loaderror', () => {
			if (attempt < 3 && !game._loadingErrorIsDisplayed) {
				attempt++;
				window.setTimeout(() => {
					this.load();
				}, attempt * 1000);
			} else {
				game.showLoadingError((this as any)._src);
			}
		});
	}
	/// #if EDITOR
	play(spriteOrId?: string | number): number {
		if (!game.editor.settings.getItem('sound-muted') || game.__EDITOR_mode) {
			return super.play(spriteOrId);
		}
		return undefined!;
	}
	/// #endif

	loadedWithError = false;
	lastPlayStartFrame = 0;

	soundIdSaved?: number;

	preciseDuration = 0;
}

export type { HowlSoundOptions };

