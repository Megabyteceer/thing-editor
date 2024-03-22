import game from '../game.js';

let downedKeys: Set<number> = new Set();
const keyUpsToApply: number[] = [];

let w = window;
try {
	while (w) {
		w.addEventListener('keydown', (ev) => {
			downedKeys.add(ev.keyCode);

			/// #if EDITOR
			return;
			/// #endif
			if (ev.keyCode >= 37 && ev.keyCode <= 40) { //eslint-disable-line no-unreachable
				ev.preventDefault();
			}

			//console.log(ev.keyCode);
		});

		w.addEventListener('keyup', (ev) => {

			/// #if EDITOR
			if (game.__EDITOR_mode) {
				downedKeys.delete(ev.keyCode);
				return;
			}
			/// #endif
			keyUpsToApply.push(ev.keyCode);
		});

		if (w.parent !== w) {
			w = w.parent as any;
		} else {
			break;
		}
	}
} catch (_e) {
	/// catch parent window access for iframed on another websites
}

export default class Keys {

	static update() {
		while (keyUpsToApply.length > 0) {
			downedKeys.delete(keyUpsToApply.pop() as number);
		}
	}

	static get all() {
		return downedKeys;
	}

	static get up() {
		return downedKeys.has(38) || downedKeys.has(87);
	}

	static set up(val) {
		if (val) {
			downedKeys.add(38);
		} else {
			downedKeys.delete(38);
			downedKeys.delete(87);
		}
	}

	static get down() {
		return downedKeys.has(40) || downedKeys.has(83);
	}

	static set down(val) {
		if (val) {
			downedKeys.add(40);
		} else {
			downedKeys.delete(40);
			downedKeys.delete(83);
		}
	}

	static get shiftKey() {
		return downedKeys.has(16);
	}

	static get altKey() {
		return downedKeys.has(18);
	}

	static get ctrlKey() {
		return downedKeys.has(17);
	}

	static get left() {
		return downedKeys.has(37) || downedKeys.has(65);
	}

	static set left(val) {
		if (val) {
			downedKeys.add(37);
		} else {
			downedKeys.delete(37);
			downedKeys.delete(65);
		}
	}

	static get right() {
		return downedKeys.has(39) || downedKeys.has(68);
	}

	static set right(val) {
		if (val) {
			downedKeys.add(39);
		} else {
			downedKeys.delete(39);
			downedKeys.delete(68);
		}
	}

	static isKeycodePressed(keyCode: number) {
		return downedKeys.has(keyCode);
	}

	static resetAll() {
		downedKeys.clear();
	}
}

/// #if EDITOR
(Keys.resetAll as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Keys.isKeycodePressed as SelectableProperty).___EDITOR_isGoodForChooser = true;
(Keys.update as SelectableProperty).___EDITOR_isHiddenForChooser = true;


/// #endif
