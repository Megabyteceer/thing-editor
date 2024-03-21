import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import game from 'thing-editor/src/engine/game';

export default class Mask extends Container {

	_maskComponentIsActive = false;

	init() {
		super.init();
		this._maskComponentIsActive = true;
		if (this._enabled) {
			this.enableMask();
		}
	}

	@editable(editorUtils.makePreviewModeButton('Preview masked', 'components.Mask#preview-masked'))

	_enabled = true;
	@editable()

	set enabled(v) {
		this._enabled = v;
		if (this._maskComponentIsActive) {
			if (v) {
				this.enableMask();
			} else {
				this.disableMask();
			}
		}
	}

	get enabled() {
		return this._enabled;
	}

	__maskVisibilityTmp = false;

	enableMask() {
		this.mask = this.findChildByName('mask') as any;

		/// #if EDITOR
		if (!this.mask) {
			game.editor.ui.status.warn('Mask component did not found child named "mask".', 32022, this);
		}
		/// #endif
		if (this.mask) {
			this.__maskVisibilityTmp = (this.mask as Container).visible;
		}
		if (this.mask) {
			(this.mask as Container).visible = true;
		}
	}

	disableMask() {
		if (this.mask) {
			(this.mask as Container).visible = this.__maskVisibilityTmp;
		}
		this.mask = null;
	}

	onRemove() {
		super.onRemove();
		this._maskComponentIsActive = false;
		this.disableMask();
	}

	/// #if EDITOR

	constructor() {
		super();
		this.__exitPreviewMode = this.__exitPreviewMode.bind(this);
	}

	__goToPreviewMode() {
		this.enableMask();
	}

	__exitPreviewMode() {
		this.disableMask();
	}
	/// #endif
}

/// #if EDITOR
Mask.__EDITOR_icon = 'tree/mask';

(Mask.prototype.enableMask as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Mask.prototype.disableMask as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
/// #endif
