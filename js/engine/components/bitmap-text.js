import L from "thing-editor/js/engine/utils/l.js";
import getValueByPath from "thing-editor/js/engine/utils/get-value-by-path.js";

const CENTER = 'center';
const LEFT = 'left';
const RIGHT = 'right';
const TOP = 'top';
const BOTTOM = 'bottom';

const alignValues = {
	'center': 0.5,
	'left': 0.0,
	'right': 1.0,
	'top': 0.0,
	'bottom': 1.0
};
const EMPTY_FONT_NAME = 'EMPTY';
const emptyFontData = new PIXI.BitmapFontData();
emptyFontData.info[0] = {face: EMPTY_FONT_NAME, size: 32};
emptyFontData.page[0] = {id: 0, file: ''};
emptyFontData.common[0] = {lineHeight: 32};
PIXI.BitmapFont.install(emptyFontData, PIXI.Texture.EMPTY);

export default class BitmapText extends PIXI.BitmapText {
	
	constructor() {
		super('', {fontName: EMPTY_FONT_NAME, fontSize: 32});
	}

	init() {
		super.init();
		this.updateText();
		if(this.textProvider) {
			this._textProvider = getValueByPath(this.textProvider, this);
		} else {
			this._textProvider = null;
		}
	}

	updateText() {
		if(this.fontName === EMPTY_FONT_NAME) {
			return;
		}

		/// #if EDITOR
		if(!PIXI.BitmapFont.available[this.fontName]) {
			setTimeout(() => {
				editor.ui.status.error('BitmapFont is not exists: ' + this._fontName, 32053, this, 'fontName');
			}, 0);
			return;
		}
		if(this.fontSize === 0) {
			this.fontSize = PIXI.BitmapFont.available[this.fontName].size;
		}
		/// #endif
		super.updateText();
		this.maxW = this._maxW || 0; // recalculate max width
	}

	get maxW () {
		return this._maxW;
	}

	forAllChildren(cb) {
		/// #if EDITOR
		if(editor.game.__EDITOR_mode) {
			super.forAllChildren(cb);
		}
		/// #endif
	}

	set maxW(val) {
		this._maxW = val;
		if(this._maxW !== 0) {
			if(this._textWidth > this._maxW) {
				var q = this._maxW / this._textWidth;
				if(this.scale.x !== q || this.scale.y !== q) {
					this.scale.x = q;
					this.scale.y = q;
					if(this.parent) {
						this.updateTransform();
					}
				}
			} else {
				if(this.scale.x !== 1 || this.scale.y !== 1) {
					this.scale.x = 1;
					this.scale.y = 1;
					if(this.parent) {
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
		if(this._textProvider) {
			this.text = this._textProvider.text;
		}
	}

	set "font.name" (v) {
		this.fontName = v;
		/// #if EDITOR
		this.validate();
		/// #endif
	}

	get "font.name" () {
		return this.fontName;
	}

	set "font.size" (v) {
		this.fontSize = v;
		/// #if EDITOR
		this.validate();
		/// #endif
	}

	get "font.size" () {
		return this.fontSize;
	}

	set "font.align" (v) {
		this.align = v;
		this.anchor.x = alignValues[v];
		/// #if EDITOR
		this.validate();
		/// #endif
	}

	get "font.align" () {
		return this.align;
	}

	set verticalAlign (v) {
		this._verticalAlign = v;
		this.anchor.y = alignValues[v];
	}

	get verticalAlign () {
		return this._verticalAlign;
	}

	onLanguageChanged() {
		if(this._translatableText) {
			let t = this._translatableText;
			this._translatableText = null;
			this.translatableText = t;
		}
	}

	get translatableText () {
		return this._translatableText;
	}

	set translatableText (val) {
		if(this._translatableText !== val) {
			if(val) {
				/// #if EDITOR
				if(!L.has(val)) {
					editor.ui.status.warn("translatableText refers to not existing key.", 32032, this, 'translatableText');
				}
				/// #endif
				this.text = L(val);
			}
			this._translatableText = val;
		}
	}

	/// #if EDITOR

	__beforeSerialization() {
		if(this._translatableText) {
			this.text = '';
		}

		this.clearBitmapText();

		if(this.maxW > 0) {
			this.scale.x = 1;
			this.scale.y = 1;
		}
	}

	__afterSerialization() {
		if(this._translatableText) {
			this.text = L(this._translatableText);
		}
		this.updateText();
		if(this.maxW > 0) {
			let tmp = this.maxW;
			this.maxW = 0;
			this.maxW = tmp;
		}
	}

	__EDITOR_onCreate() {
		const fontName = Object.keys(PIXI.BitmapFont.available).find((name) => name !== EMPTY_FONT_NAME);
		if(fontName) {
			this.text = 'New BitmapText 1';
			this.fontName = fontName;
			this.fontSize = PIXI.BitmapFont.available[fontName].size;
		}
		this.__afterDeserialization();
	}

	__beforeDestroy() {
		this.text = '';
		this.clearBitmapText();
	}

	__afterDeserialization() {
		__getNodeExtendData(this).hideAllChildren = true;
	}
	/// #endif
}

/// #if EDITOR
import LanguageView from "thing-editor/js/editor/ui/language-view.js";

BitmapText.__EDITOR_icon= "tree/bitmap-text";
BitmapText.__EDITOR_group = "Basic";
BitmapText.__canNotHaveChildren = true;


__EDITOR_editableProps(BitmapText, [ //list of editable properties
	{
		type: 'splitter',
		title: 'BitmapText',
		name: 'BitmapText-props'
	},
	{
		name:'text',
		type:String,
		default:'',
		disabled:(node) => {
			return node.translatableText;
		}
	},
	window.makeTranslatableSelectEditablePropertyDecriptor('translatableText'),
	{
		type: 'btn',
		title: 'Edit or create new translatable key.',
		name: 'Edit text',
		helpUrl: 'components.Text#edit-text',
		onClick: (o) => {
			LanguageView.editKey(o.translatableText);
		}
	},
	{
		name:'font.name',
		type:String,
		default:EMPTY_FONT_NAME,
		select:() => {
			let names = Object.keys(PIXI.BitmapFont.available);
			if(!names.find((name) => name !== EMPTY_FONT_NAME)) {
				setTimeout(() => {
					editor.ui.status.warn("It is no any bitmap fonts (xml) files in '/img' subfolders.", 32046, editor.selection[0]);
				}, 0);
			}
			return names.map((n) => {
				return {name:n, value: n};
			});
		}
	},
	{
		name:'font.size',
		type:Number
	},
	{
		name: 'letterSpacing',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'tint',
		basis: 16,
		type: Number,
		default: 0xFFFFFF,
		max: 0xFFFFFF,
		min: 0
	},
	{
		name: 'font.align',
		type: String,
		select: [
			{name: CENTER, value: CENTER},
			{name: LEFT, value: LEFT},
			{name: RIGHT, value: RIGHT}
		],
		default: CENTER
	},
	{
		name: 'verticalAlign',
		type: String,
		select: [
			{name: TOP, value: TOP},
			{name: CENTER, value: CENTER},
			{name: BOTTOM, value: BOTTOM}
		],
		default: CENTER
	},
	{
		name: 'textProvider',
		type: 'data-path',
		isValueValid: (o) => {
			return o.text;
		}

	},
	{
		name: 'maxW',
		type: Number,
		afterEdited: (overrideO) => {
			let o = overrideO || editor.selection[0];
			afterEdited(o, o.maxW);
		},
		min: 0
	}
]);


function afterEdited (overrideO, x) {
	let o = overrideO || editor.selection[0];
	if(x === 0) {
		for(let t of editor.selection) {
			t.scale.x = 1;
			t.scale.y = 1;
		}
	} else {
		switch(o.font.align) {
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
		editor.overlay.guideX(x , o);
		o.scale.x = tmpScale;
		o.scale.y = tmpScale;
	}
}

/// #endif
