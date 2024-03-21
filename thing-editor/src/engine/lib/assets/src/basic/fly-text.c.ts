import type { Container } from 'pixi.js';
import { Text } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

export default class FlyText extends Text {

	phase = 0;

	init() {
		super.init();
		this.phase = 0;
	}

	hide() {
		this.phase = 0;
	}

	update() {
		super.update();
		this.y -= 1.0;
		this.phase--;
		if (this.phase <= 0) {
			this.alpha -= 0.05;
			if (this.alpha <= 0.0) {
				this.remove();
			}
		} else {
			if (this.alpha < 0.95) {
				this.alpha += 0.2;
			}
		}
	}

	static flyText(text: string, X: number | null = null, Y: number | null = null, type = 'fly-text', lengthAdd = 0, container?: Container | string) {
		assert(!game.__EDITOR_mode, 'Attempt to call FlyText.flyText() in editing mode.', 10010);
		assert(game.currentContainer, 'FlyText.flyText() can be invoked only after first scene has been shown', 10011);


		if (typeof X !== 'number') {
			X = game.W / 2;
		}
		if (typeof Y !== 'number') {
			Y = game.H / 2;
		}

		let f = Lib.loadPrefab(type) as FlyText;
		assert(f instanceof FlyText, 'FlyText instance expected.', 10011);
		if (typeof text !== 'string') {
			text = (text as any).toString();
		}
		f.text = text;
		f.phase = text.length * 6 + lengthAdd;

		if (container) {
			if (typeof container === 'string') {
				container = getValueByPath(container, game.currentContainer);
			}
		} else {
			container = game.currentContainer;
			let fld = (f.width / 2) + 5.0;

			if (X < fld) {
				X = fld;
			}

			if (X > (game.W - fld)) {
				X = (game.W - fld);
			}
		}

		f.alpha = 0.0;
		f.x = X;
		f.y = Y;

		(container as Container).addChild(f);
		return f;
	}
}


/// #if EDITOR

FlyText.__EDITOR_icon = 'tree/fly-text';

(FlyText as SelectableProperty).flyText.___EDITOR_isGoodForCallbackChooser = true;
(FlyText as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(FlyText as SelectableProperty).___EDITOR_isHiddenForDataChooser = true;

(FlyText.flyText as SelectableProperty).___EDITOR_callbackParameterChooserFunction = () => {
	return game.editor.ui.modal.showPrompt('Enter text to show', 'Text-1', undefined, game.editor.validateCallbackParameter);
};
/// #endif
