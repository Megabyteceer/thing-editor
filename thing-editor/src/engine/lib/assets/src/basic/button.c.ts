import editable from 'thing-editor/src/editor/props-editor/editable';

import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import { mouseHandlerGlobal } from 'thing-editor/src/engine/utils/game-interaction';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import Sound from 'thing-editor/src/engine/utils/sound';

let latestClickTime = 0;
const SCROLL_THRESHOLD = 30;

export default class Button extends DSprite {

	onClickCallback?: () => void;

	@editable({ name: 'interactive', default: true, override: true })

	@editable({ type: 'image' })
	hoverImage = null;
	@editable({ type: 'image' })
	pressImage = null;
	@editable({ type: 'image' })
	disabledImage = null;

	@editable({ visible: (o) => { return !o.disabledImage; }, min: 0, max: 1, step: 0.01, default: 0.76 })
	disabledAlpha = 0;

	@editable({ type: 'callback', important: true })
	onClick: string[] = [];

	@editable()
	hotkey = 0;

	@editable({ type: 'sound' })
	sndClick: string | null = null;

	@editable({ type: 'sound' })
	sndOver: string | null = null;

	get scrollable() {
		if (game.classes.ScrollLayer) {
			const parentScrollLayer = this.findParentByType(game.classes.ScrollLayer);
			return parentScrollLayer &&
				((parentScrollLayer.fullArea.w > parentScrollLayer.visibleArea.w) ||
					(parentScrollLayer.fullArea.h > parentScrollLayer.visibleArea.h)
				);
		}
		return false;
	}

	initialScale!: number;
	initialImage!: string | null;

	curDelay = 0;

	@editable({ min: 0 })
	repeatDelay = 0;

	@editable({ min: 0 })
	repeatInterval = 0;

	pointerStartPos?: { x: number; y: number };

	constructor() {
		super();
		this.cursor = 'pointer';
	}

	init() {
		super.init();

		this.on('pointerdown', this.onDown);
		this.on('pointerup', this.onUp);
		this.on('pointerover', this.onOver);
		this.on('pointerout', this.onOut);

		assert(!game.__EDITOR_mode, '\'init()\' called in edition mode');
		assert(allActiveButtons.indexOf(this) < 0, 'Button already in active list.');
		allActiveButtons.unshift(this);

		this.initialScale = this.scale.x;
		this.initialImage = this.image;
		if (this.interactive) {
			this.enable();
		} else {
			this.disable();
		}

		this.pointerStartPos = undefined;
	}

	onRemove() {
		super.onRemove();
		this.onOut();

		this.removeListener('pointerdown', this.onDown);
		this.removeListener('pointerup', this.onUp);
		this.removeListener('pointerover', this.onOver);
		this.removeListener('pointerout', this.onOut);

		let i = allActiveButtons.indexOf(this);
		/// #if DEBUG
		assert((!this._thing_initialized) || (i >= 0), 'Button is not in active list.');
		this._thing_initialized = false;
		/// #endif

		if (i >= 0) { // could be removed before initialization in parent init method
			allActiveButtons.splice(i, 1);
		}

		if (downedByKeycodeButton === this) {
			downedByKeycodeButton = undefined;
		}
		this.initialImage = null;
		this.interactive = false;

		if (this.hasOwnProperty('onClickCallback')) {
			delete (this.onClickCallback);
		}
	}

	disable() {
		if (this.initialImage) {
			this.onUp();
			this.onOut();
			if (this.disabledImage) {
				this.image = this.disabledImage;
			} else {
				this.alpha = this.disabledAlpha;
			}
		}
		this.interactive = false;
	}

	enable() {
		if (this.initialImage) {
			if (this.disabledImage) {
				this.image = this.initialImage;
			} else {
				this.alpha = 1;
			}
		}
		this.interactive = true;
	}

	static clickedButton: Button | null = null;
	static overedButton: Button | null = null;
	static downedButton: Button | null = null;

	get isOvered() {
		return this === Button.overedButton;
	}

	get isDowned() {
		return this === Button.downedButton;
	}

	click() {
		if (this.isCanBePressed) {
			this._executeOnClick('invoke');
		}
	}

	static globalOnClick?: (b: Button, source?: string) => void;

	_executeOnClick(source/** optional tracking tag */?: string) {
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			return;
		}
		/// #endif
		assert(this.isCanBePressed, '_executeOnClick called for button which could not be pressed at the moment.');

		if (Button.globalOnClick) {
			Button.globalOnClick(this, source);
		}

		Button.clickedButton = this;
		if (this.onClickCallback) {
			this.onClickCallback();
		}

		for (const action of this.onClick) {
			callByPath(action, this);
		}

		if (source === 'hotkey') {
			if (game.classes.ClickOutsideTrigger) {
				game.classes.ClickOutsideTrigger.shootAll(this);
			}
		}

		Button.clickedButton = null;

		if (this.sndClick) {
			Sound.play(this.sndClick);
		}

		latestClickTime = game.time;
	}

	onDown(ev: PointerEvent | null, source = 'pointerdown') {
		Sound._unlockSound();
		if (game.time === latestClickTime
			/// #if EDITOR
			&& !game.__paused
			/// #endif
		) {
			return;
		}
		if (ev) {
			if (ev.buttons !== 1) {
				return;
			}
			mouseHandlerGlobal(ev);
		}
		if (this.isCanBePressed && (Math.abs(latestClickTime - game.time) > 1)) {
			if (Button.downedButton !== this) {
				if (Button.downedButton) {
					Button.downedButton.onUp();
				}
				if (this.pressImage) {
					this.image = this.pressImage;
				} else {
					this.scale.x =
						this.scale.y = this.initialScale * (this.isOvered ? 1 : 0.9);
				}
				Button.downedButton = this;
				this.curDelay = this.repeatDelay;

				if (this.scrollable) {
					this.pointerStartPos = { x: game.mouse.x, y: game.mouse.y };
				} else {
					this._executeOnClick(source);
				}
			}
		}
	}

	update() {

		/// #if EDITOR
		if (this.isCanBePressed) {
			this.onClick.forEach((action, i) => {
				let f;
				try {
					f = getValueByPath(action, this, true);
				} catch (_er) { }
				if (typeof f !== 'function') {
					game.editor.ui.status.error('Wrong onClick handler: ' + action, 32054, this, 'onClick', i);
					getValueByPath(action, this, true);
				}
			});
		}
		/// #endif

		if (this.isDowned) {
			if ((!game.mouse.click && (downedByKeycodeButton !== this)) || !game.isFocused) {
				this.onUp();
			} else if (this.curDelay > 0) {
				this.curDelay--;
				if (this.curDelay === 0) {
					if (this.isCanBePressed && (Math.abs(latestClickTime - game.time) > 1)) {
						this._executeOnClick('autorepeat');
					}
					this.curDelay = this.repeatInterval;
				}
			}
		}
		super.update();
	}

	onUp(ev?: PointerEvent | KeyboardEvent, src = 'pointerup') {
		if (Button.downedButton === this) {
			if (this.pressImage) {
				if (this.initialImage) {
					this.image = this.initialImage;
				}
			} else {
				this.scale.x =
					this.scale.y = this.initialScale * ((this.isOvered && !this.hoverImage) ? 1.05 : 1);
			}
			Button.downedButton = null;

			if (ev && this.scrollable && Math.hypot(game.mouse.x - this.pointerStartPos!.x, game.mouse.y - this.pointerStartPos!.y) <= SCROLL_THRESHOLD) {
				this._executeOnClick(src);
			}
		}
	}

	onOver() {

		if (Button.overedButton !== this) {
			if (Button.overedButton) {
				Button.overedButton.onOut();
			}
			Button.overedButton = this;
			if (this.hoverImage) {
				this.image = this.hoverImage;
			} else {
				this.scale.x =
					this.scale.y = this.initialScale * 1.05;
			}

			if (this.sndOver) {
				Sound.play(this.sndOver);
			}
			this.gotoLabelRecursive('btn-over');
		}
	}

	_onDisableByTrigger() {
		this.onOut();
	}

	onOut() {
		if (Button.overedButton === this) {
			Button.overedButton = null;

			if (this.hoverImage) {
				if (this.initialImage) {
					this.image = this.initialImage;
				}
			} else {
				this.scale.x =
					this.scale.y = this.initialScale;
			}

			this.onUp();
			this.gotoLabelRecursive('btn-out');
		}
	}

	static _tryToClickByKeycode(keyCode: number): Button | undefined {
		for (let b of allActiveButtons) {
			if ((b.hotkey === keyCode) && b.isCanBePressed) {
				b.onDown(null, 'hotkey');
				return b;
			}
		}
	}

	/// #if EDITOR
	__EDITOR_onCreate() {
		if (Lib.hasTexture('ui/button.png')) {
			this.image = 'ui/button.png';
		}
		if (Lib.hasSound('click')) {
			this.sndClick = 'click';
		}
		if (Lib.hasSound('over')) {
			this.sndOver = 'over';
		}
	}


	/// #endif

}

let downedByKeycodeButton: Button | undefined;

let allActiveButtons: Button[] = [];

window.addEventListener('keydown', (ev) => {
	if (ev.repeat) {
		return;
	}
	/// #if EDITOR
	if (game.__EDITOR_mode) {
		return;
	}
	/// #endif

	downedByKeycodeButton = Button._tryToClickByKeycode(ev.keyCode);
	if (downedByKeycodeButton) {
		ev.preventDefault();
		ev.stopPropagation();
	}
});

window.addEventListener('keyup', (ev) => {
	if (downedByKeycodeButton && downedByKeycodeButton.hotkey === ev.keyCode) {
		downedByKeycodeButton.onUp(ev, 'hotkey');
		downedByKeycodeButton = undefined;
	}
});


/// #if EDITOR

Button.__EDITOR_icon = 'tree/button';

(Button.prototype.enable as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Button.prototype.disable as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Button.prototype.click as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

/// #endif
