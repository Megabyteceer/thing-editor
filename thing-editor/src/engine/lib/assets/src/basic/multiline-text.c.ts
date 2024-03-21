import { Text } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import ___Guide from 'thing-editor/src/engine/lib/assets/src/___system/guide.c';

const CENTER = 'center';
const BOTTOM = 'bottom';

export default class MultilineText extends Text {

	@editable({ name: 'maxWidth', type: 'number', override: true, visible: (_o: MultilineText) => { return false; } })

	@editable({ afterEdited: afterMaxWidthEdit, min: 10, disabled: () => { return game.isPortrait; } })
	maxWidthLandscape = 400;
	@editable({ afterEdited: afterMaxWidthEdit, min: 10, disabled: () => { return !game.isPortrait; } })
	maxWidthPortrait = 400;

	_maxHeightLandscape = 0;
	_maxHeightPortrait = 0;

	@editable({ min: 0, disabled: () => { return game.isPortrait; }, afterEdited: afterMaxHeightEdit })
	get maxHeightLandscape() {
		return this._maxHeightLandscape;
	}

	set maxHeightLandscape(val) {
		this._maxHeightLandscape = val;
		if (!game.isPortrait && (val !== 0)) {
			this._applyMaxHeight();
		}
	}

	@editable({ min: 0, disabled: () => { return !game.isPortrait; }, afterEdited: afterMaxHeightEdit })
	get maxHeightPortrait() {
		return this._maxHeightPortrait;
	}

	set maxHeightPortrait(val) {
		this._maxHeightPortrait = val;
		if (game.isPortrait && (val !== 0)) {
			this._applyMaxHeight();
		}
	}

	@editable()
	get breakWords() {
		return this.style.breakWords;
	}

	set breakWords(val) {
		this.style.breakWords = val;
	}

	init() {
		super.init();
		this.applyWorldWrapping();
	}

	applyWorldWrapping() {
		if (this.style) {
			this.style.wordWrapWidth = (game.isPortrait ? this.maxWidthPortrait : this.maxWidthLandscape);
			this.style.wordWrap = true;
			this._applyMaxHeight();
		}
	}

	_onRenderResize() {
		this.applyWorldWrapping();
	}

	_onTextureUpdate() {
		super._onTextureUpdate();
		this._applyMaxHeight();
	}

	_applyMaxHeight() {
		if (this.style) {
			this.maxWidth = this.style.wordWrapWidth;
		}
		let h = game.isPortrait ? this._maxHeightPortrait : this._maxHeightLandscape;
		if ((h > 0) && (this._texture.height > h)) {
			let q = h / this._texture.height;
			if (this.scale.x !== q || this.scale.y !== q) {
				this.scale.x = q;
				this.scale.y = q;
			}
		}
	}

	/// #if EDITOR
	__beforeSerialization() {
		super.__beforeSerialization!();
		if ((game.isPortrait ? this._maxHeightPortrait : this._maxHeightLandscape) > 0) {
			this.scale.x = 1;
			this.scale.y = 1;
		}
	}

	__afterDeserialization() {
		this.applyWorldWrapping();
	}

	__afterSerialization(data: SerializedObject) {
		delete data.p.maxWidth;
		super.__afterSerialization!(data);
		this._applyMaxHeight();
	}
	/// #endif
}

/// #if EDITOR

MultilineText.__EDITOR_icon = 'tree/multiline-text';

function afterMaxHeightEdit() {
	let o = game.editor.selection[0] as MultilineText;
	let yBottom = game.isPortrait ? o._maxHeightPortrait : o._maxHeightLandscape;
	let yTop = 0;
	if (yBottom === 0) {
		for (let t of game.editor.selection) {
			t.scale.x = 1;
			t.scale.y = 1;
		}
		___Guide.hide('maxHeightBottom');
		___Guide.hide('maxHeightTop');
	} else {
		switch ((o as any).verticalAlign) {
			case CENTER:
				yBottom *= 0.5;
				yTop = -yBottom;
				break;
			case BOTTOM:
				yBottom *= -1;
				break;
		}
		let tmpScale = o.scale.x;
		o.scale.x = 1;
		o.scale.y = 1;
		___Guide.show(0, yBottom, 0, 'maxHeightBottom', o);
		___Guide.show(0, yTop, 0, 'maxHeightTop', o);
		o.scale.x = tmpScale;
		o.scale.y = tmpScale;
	}
}

function afterMaxWidthEdit() {
	for (let o of game.editor.selection as any as MultilineText[]) {
		o.applyWorldWrapping();
	}
	let o = game.editor.selection[0] as MultilineText;

	let props = (o.constructor as SourceMappedConstructor).__editableProps;
	for (let p of props) {
		if (p.name === 'maxWidth') {
			o.maxWidth = o.style.wordWrapWidth;
			p.afterEdited!();
			o.maxWidth = 0;
			break;
		}
	}
}
/// #endif
