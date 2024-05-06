import type { Text, TextStyleAlign } from 'pixi.js';
import { BitmapFont, BitmapFontData, BitmapText as BitmapTextOriginal, MIPMAP_MODES, Texture } from 'pixi.js';

import { _editableEmbed } from 'thing-editor/src/editor/props-editor/editable';
import LanguageView from 'thing-editor/src/editor/ui/language-view';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import L from 'thing-editor/src/engine/utils/l';
import ___Guide from '../___system/guide.c';

const CENTER = 'center';
const LEFT = 'left';
const RIGHT = 'right';
const TOP = 'top';
const BOTTOM = 'bottom';

const alignValues = {
	center: 0.5,
	left: 0.0,
	right: 1.0,
	top: 0.0,
	bottom: 1.0
};
const EMPTY_FONT_NAME = 'EMPTY';

assert(
	BitmapFont.install instanceof Function,
	'Thing editor needs refactoring of BitmapFont atlases error handling.'
);
const origin_font_install = BitmapFont.install;
BitmapFont.install = function (this : typeof BitmapFont, _data: any, textures: Texture | Texture[]): BitmapFont | undefined {
	try {
		Object.values(textures instanceof Texture ? [textures] : textures).forEach((texture) => {
			if (!texture || texture === Texture.EMPTY) return;
			texture.baseTexture.mipmap = MIPMAP_MODES.ON;
		});
		return origin_font_install.apply(this, arguments as any);
	} catch (er) {
		game.showLoadingError(
			'BitmapFont installing error: ' + (er as Error).message + (_data ? JSON.stringify(_data, null, ' ') : '')
		);
	}
} as any;

const emptyFontData = new BitmapFontData();
emptyFontData.info[0] = { face: EMPTY_FONT_NAME, size: 32 };
emptyFontData.page[0] = { id: 0, file: '' };
emptyFontData.common[0] = { lineHeight: 32 };
BitmapFont.install(emptyFontData, Texture.EMPTY);

export default class BitmapText extends BitmapTextOriginal {

	constructor() {
		super('', { fontName: EMPTY_FONT_NAME, fontSize: 32 });
	}

	textProvider: string | null = null;

	_textProvider: Text | null = null;

	_maxW = 0;

	_translatableText: string | null = null;

	init() {
		super.init();
		this.updateText();
		if (this.textProvider) {
			this._textProvider = getValueByPath(this.textProvider, this);
		} else {
			this._textProvider = null;
		}
	}

	updateText() {
		if (this.fontName === EMPTY_FONT_NAME) {
			return;
		}

		/// #if EDITOR
		if (!BitmapFont.available[this.fontName]) {
			setTimeout(() => {
				game.editor.ui.status.error('BitmapFont is not exists: ' + this._fontName, 32053, this, 'fontName');
			}, 0);
			return;
		}
		if (this.fontSize === 0) {
			this.fontSize = BitmapFont.available[this.fontName].size;
		}
		/// #endif
		super.updateText();
		this.maxW = this._maxW || 0; // recalculate max width
	}

	forAllChildren(cb:any) {
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			super.forAllChildren(cb);
		}
		/// #endif
	}

	get maxW() {
		return this._maxW;
	}

	set maxW(val) {
		this._maxW = val;
		if (this._maxW !== 0) {
			if (this._textWidth > this._maxW) {
				var q = this._maxW / this._textWidth;
				if (this.scale.x !== q || this.scale.y !== q) {
					this.scale.x = q;
					this.scale.y = q;
					if (this.parent) {
						this.updateTransform();
					}
				}
			} else {
				if (this.scale.x !== 1 || this.scale.y !== 1) {
					this.scale.x = 1;
					this.scale.y = 1;
					if (this.parent) {
						this.updateTransform();
					}
				}
			}
		}
	}

	clearBitmapText() {
		this.removeChildren();
	}

	onRemove() {
		super.onRemove();
		this.clearBitmapText();
	}

	update() {
		super.update();
		if (this._textProvider) {
			this.text = this._textProvider.text;
		}
	}

	set 'font.name'(v) {
		/// #if EDITOR
		let names = Object.keys(BitmapFont.available);
		if (!names.find((name) => name === v)) {
			game.editor.ui.status.warn(
				'It is no any bitmap font name \'' + v + '\' in \'/img\' subfolders.',
				99999,
				this,
				'font.name'
			);
			return;
		}

		/// #endif
		this.fontName = v;
		/// #if EDITOR
		this.validate();
		/// #endif
	}

	get 'font.name'() {
		return this.fontName;
	}

	set 'font.size'(v) {
		this.fontSize = v;
		/// #if EDITOR
		this.validate();
		/// #endif
	}

	get 'font.size'() {
		return this.fontSize;
	}

	set 'font.align'(v:string) {
		this.align = v as any;
		this.anchor.x = alignValues[v as 'center'];
		/// #if EDITOR
		this.validate();
		/// #endif
	}

	get 'font.align'() {
		return this.align;
	}

	_verticalAlign = CENTER as TextStyleAlign;

	set verticalAlign(v:TextStyleAlign) {
		this._verticalAlign = v;
		this.anchor.y = alignValues[v as 'center'];
	}

	get verticalAlign():TextStyleAlign {
		return this._verticalAlign;
	}

	onLanguageChanged() {
		if (this._translatableText) {
			let t = this._translatableText;
			this._translatableText = null;
			this.translatableText = t;
		}
	}

	get translatableText() {
		return this._translatableText;
	}

	set translatableText(val) {
		if (this._translatableText !== val) {
			if (val) {
				/// #if EDITOR
				if (!L.has(val)) {
					game.editor.ui.status.warn(
						'translatableText refers to not existing key.',
						32032,
						this,
						'translatableText'
					);
				}
				/// #endif
				this.text = L(val);
			}
			this._translatableText = val;
		}
	}

	/// #if EDITOR

	render(renderer:any) {
		super.render(renderer);
		for (const c of this.children) {
			if (!c.__nodeExtendData) {
				c.__nodeExtendData = {};
			}
		}
	}

	__beforeSerialization() {
		if (this._translatableText) {
			this.text = '';
		}

		this.clearBitmapText();

		if (this.maxW > 0) {
			this.scale.x = 1;
			this.scale.y = 1;
		}
	}

	__afterSerialization() {
		if (this._translatableText) {
			this.text = L(this._translatableText);
		}
		this.updateText();
		if (this.maxW > 0) {
			let tmp = this.maxW;
			this.maxW = 0;
			this.maxW = tmp;
		}
	}

	__EDITOR_onCreate() {
		const fontName = Object.keys(BitmapFont.available).find((name) => name !== EMPTY_FONT_NAME);
		if (fontName) {
			this.text = 'New BitmapText 1';
			this.fontName = fontName;
			this.fontSize = BitmapFont.available[fontName].size;
		}
		this.__afterDeserialization();
	}

	__beforeDestroy() {
		this.text = '';
		this.clearBitmapText();
	}

	__afterDeserialization() {
		this.__hideChildren = true;
	}

	static __canAcceptChild() {
		return false;
	}

	/// #endif
}

/// #if EDITOR

_editableEmbed(BitmapText, 'text', {
	type: 'string',
	default: '',
	disabled: (node:BitmapText) => {
		return node.translatableText;
	},
	multiline: true
});

_editableEmbed(BitmapText, 'translatableText', { type: 'l10n' });

_editableEmbed(BitmapText, 'Edit text', {
	type: 'btn',
	helpUrl: 'components.Text#edit-text',
	title: 'Edit or create new translatable key.',
	onClick: (o: BitmapText) => {
		LanguageView.editKey(o.translatableText);
	}
});

_editableEmbed(BitmapText, 'font.name', {
	type: 'string',
	default: EMPTY_FONT_NAME,
	select: () => {
		let names = Object.keys(BitmapFont.available);
		if (!names.find((name) => name !== EMPTY_FONT_NAME)) {
			setTimeout(() => {
				game.editor.ui.status.warn(
					'There is no any bitmap fonts (xml) in \'/assets\' folder.',
					32046,
					game.editor.selection[0]
				);
			}, 0);
		}
		return names.map((n) => {
			return { name: n, value: n };
		});
	}
});

_editableEmbed(BitmapText, 'font.size', {
	type: 'number', min: 0
});

_editableEmbed(BitmapText, 'Reset font size', {
	type: 'btn',
	onClick: () => {
		for (const t of game.editor.selection as any) {
			if (t._font) {
				game.editor.onObjectsPropertyChanged(t, 'font.size', t._font.size);
			}
		}
	}
});

_editableEmbed(BitmapText, 'font.align', {
	type: 'string',
	select: [
		{ name: CENTER, value: CENTER },
		{ name: LEFT, value: LEFT },
		{ name: RIGHT, value: RIGHT }
	],
	default: CENTER
});

_editableEmbed(BitmapText, 'verticalAlign', {
	type: 'string',
	select: [
		{ name: TOP, value: TOP },
		{ name: CENTER, value: CENTER },
		{ name: BOTTOM, value: BOTTOM }
	],
	default: CENTER
});

_editableEmbed(BitmapText, 'letterSpacing', {
	type: 'number',
	noNullCheck: true
});

_editableEmbed(BitmapText, 'maxW', { afterEdited: () => { let o = game.editor.selection[0] as BitmapText; afterEdited(o, o.maxW); }, min: 0});


_editableEmbed(BitmapText, 'tint', {
	type: 'number',
	basis: 16,
	noNullCheck: true,
	default: 0xffffff,
	max: 0xffffff,
	min: 0
});

_editableEmbed(BitmapText, 'textProvider', {
	type: 'data-path',
	isValueValid: (o) => {
		return 'text' in o;
	}
});

_editableEmbed(BitmapText, '__hideChildren', {
	override: true,
	default: true,
	disabled: () => true
});


BitmapText.__EDITOR_icon = 'tree/bitmap-text';

function afterEdited(overrideO:BitmapText, x:number) {
	let o = overrideO || (game.editor.selection[0] as BitmapText);
	if (x === 0) {
		for (let t of game.editor.selection) {
			t.scale.x = 1;
			t.scale.y = 1;
		}
		___Guide.hide('bitmapFontMaxWidthLeft');
	} else {
		switch (o.align) {
		case CENTER:
			x *= 0.5;
			break;
		case RIGHT:
			x *= -1;
			break;
		}
		let tmpScale = o.scale.x;
		o.scale.x = 1;
		o.scale.y = 1;
		___Guide.show(x, 0, Math.PI / 2, 'bitmapFontMaxWidthLeft', o);
		___Guide.show(-x, 0, Math.PI / 2, 'bitmapFontMaxWidthLeft', o);
		o.scale.x = tmpScale;
		o.scale.y = tmpScale;
	}
}

/// #endif
