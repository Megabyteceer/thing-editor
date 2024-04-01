
import type { TextStyleAlign, TextStyleFontWeight } from 'pixi.js';
import { Text } from 'pixi.js';

import { _editableEmbed } from 'thing-editor/src/editor/props-editor/editable';
import LanguageView from 'thing-editor/src/editor/ui/language-view';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import ___Guide from 'thing-editor/src/engine/lib/assets/src/___system/guide.c';

import L from 'thing-editor/src/engine/utils/l';

export default Text;

const CENTER = 'center';
const LEFT = 'left';
const RIGHT = 'right';
const TOP = 'top';
const BOTTOM = 'bottom';
const JUSTIFY = 'justify';

const isLetterSpacingUnsupported = !('letterSpacing' in CanvasRenderingContext2D.prototype
	|| 'textLetterSpacing' in CanvasRenderingContext2D.prototype);

const alignValues = {
	'center': 0.5,
	'left': 0.0,
	'right': 1.0,
	'top': 0.0,
	'bottom': 1.0,
	'justify': 1.0
};

type TextTransform = number;

const TEXT_TRANSFORM: KeyedMap<TextTransform> = {
	'none': 0,
	'uppercase': 1,
	'capitalize': 2,
	'lowercase': 3
};


const applyTextTransform = (value: string, textTransform: TextTransform) => {
	if (textTransform === TEXT_TRANSFORM.none) return value;
	if (textTransform === TEXT_TRANSFORM.uppercase) return value.toUpperCase();
	if (textTransform === TEXT_TRANSFORM.lowercase) return value.toLowerCase();
	if (textTransform === TEXT_TRANSFORM.capitalize) return value.replace(/(?:^|\s)\S/g, (char) => char.toUpperCase());
	assert(false, `Invalid "textTransform" value for text (${textTransform})`);
};

Object.defineProperties(Text.prototype, {
	translatableText: {
		get: function (this: Text) {
			return (this as any)._translatableText;
		},
		set: function (this: Text, val: string) {
			if ((this as any)._translatableText !== val) {
				if (val) {
					/// #if EDITOR
					if (!L.has(val)) {
						game.editor.ui.status.warn('translatableText refers to not existing key: "' + val + '"', 32032, this, 'translatableText');
					}
					/// #endif
					this.text = L(val);
				}
				(this as any)._translatableText = val;
			}
		}
	},
	image: { //remove sprite texture property
		get: function (this: Text) {
			return undefined;
		},
		set: function (this: Text) { /* empty */ }
	},
	'style.align': {
		get: function (this: Text) {
			return this.style.align;
		},
		set: function (this: Text, val) {
			if (this.style.align != val) {
				this.style.align = val;
				_refreshAnchor(this);
				checkAlignBlur(this);
			}
		}, configurable: true
	},
	'verticalAlign': {
		get: function (this: Text) {
			return (this as any)._verticalAlign;
		},
		set: function (this: Text, val) {
			if ((this as any)._verticalAlign != val) {
				(this as any)._verticalAlign = val;
				_refreshAnchor(this);
				checkAlignBlur(this);
			}
		}, configurable: true
	},
	'style.fill': {
		get: function (this: Text) {
			return (this as any)._styleFill;
		},
		set: function (this: Text, val: string) {
			if (val && val.indexOf(',') >= 0) {
				/// #if EDITOR
				val = val.replace(/(\s|")/g, '');
				/// #endif
				this.style.fill = val.split(',')
					/// #if EDITOR
					.filter((c) => {
						return isColor(c, this);
					});
				if (this.style.fill.length === 0) {
					this.style.fill = '#000';
				}
				/// #endif
			} else {
				/// #if EDITOR
				if (isColor(val, this)) {
					/// #endif
					this.style.fill = val;
					/// #if EDITOR
				}
				/// #endif
			}
			(this as any)._styleFill = val;
		}, configurable: true
	},

	/// #if EDITOR
	'___fill': {
		get: function (this: Text) {
			return ((this as any)['style.fill'] as string).split(',').map(v => parseInt(v.replace('#', ''), 16));
		},
		set: function (this: Text, val: number[]) {
			if (Array.isArray(val)) {
				(this as any)['style.fill'] = val.map(v => '#' + v.toString(16).padStart(6, '0')).join(',');
			} else {
				(this as any)['style.fill'] = '#' + (val as number).toString(16).padStart(6, '0');
			}
		}, configurable: true
	},
	/// #endif
	'style.fillGradientStops': {
		get: function (this: Text) {
			return this.style.fillGradientStops || [];
		},
		set: function (this: Text, val) {
			/// #if EDITOR
			if (typeof val === 'string') {
				val = val.split(',').map((i: string) => i ? parseFloat(i) : 1);
			}
			let min = 0;
			val.forEach((v: number, i: number) => {
				if (v < min) {
					v = min;
					val[i] = min;
				}
				min = v;
			});
			/// #endif
			this.style.fillGradientStops = val;
		}, configurable: true
	},
	'style.fontFamily': {
		get: function (this: Text) {
			return (this as any)._fontFamily;
		},
		set: function (this: Text, val) {
			this.style.fontFamily = val || game.projectDesc.defaultFont;
			(this as any)._fontFamily = val;
		}, configurable: true
	},
	'style.fontWeight': {
		get: function (this: Text) {
			return this.style.fontWeight;
		},
		set: function (this: Text, val) {
			this.style.fontWeight = val;
		}, configurable: true
	},
	'style.fontSize': {
		get: function (this: Text) {
			return this.style.fontSize;
		},
		set: function (this: Text, val) {
			this.style.fontSize = val;
		}, configurable: true
	},
	'style.leading': {
		get: function (this: Text) {
			return this.style.leading;
		},
		set: function (this: Text, val) {
			this.style.leading = val;
		}, configurable: true
	},
	'style.padding': {
		get: function (this: Text) {
			return this.style.padding;
		},
		set: function (this: Text, val) {
			this.style.padding = val;
		}, configurable: true
	},
	'style.letterSpacing': {
		get: function (this: Text) {
			return this.style.letterSpacing;
		},
		set: function (this: Text, val) {
			/// #if EDITOR
			this.style.letterSpacing = val;
			return;
			/// #endif

			if (val === 0 && isLetterSpacingUnsupported) { /*eslint-disable-line no-unreachable */
				this.style.letterSpacing = 0.001;
			} else {
				this.style.letterSpacing = val;
			}
		}, configurable: true
	},
	'style.stroke': {
		get: function (this: Text) {
			return typeof this.style.stroke === 'string' ? parseInt((this.style.stroke as string).replace('#', ''), 16) : this.style.stroke;
		},
		set: function (this: Text, val) {
			this.style.stroke = val;
		}, configurable: true
	},
	'style.strokeThickness': {
		get: function (this: Text) {
			return this.style.strokeThickness;
		},
		set: function (this: Text, val) {
			this.style.strokeThickness = val;
			this.style.lineJoin = 'round';
		}, configurable: true
	},
	'style.dropShadow': {
		get: function (this: Text) {
			return this.style.dropShadow;
		},
		set: function (this: Text, val) {
			this.style.dropShadow = val;
		}, configurable: true
	},
	'style.drShColor': {
		get: function (this: Text) {
			return typeof this.style.dropShadowColor === 'string' ? parseInt((this.style.dropShadowColor as string).replace('#', ''), 16) : this.style.dropShadowColor;
		},
		set: function (this: Text, val) {
			this.style.dropShadowColor = val;
		}, configurable: true
	},
	'style.drShAlpha': {
		get: function (this: Text) {
			return this.style.dropShadowAlpha;
		},
		set: function (this: Text, val) {
			this.style.dropShadowAlpha = val;
		}, configurable: true
	},
	'style.drShAngle': {
		get: function (this: Text) {
			return this.style.dropShadowAngle;
		},
		set: function (this: Text, val) {
			this.style.dropShadowAngle = val;
		}, configurable: true
	},
	'style.drShBlur': {
		get: function (this: Text) {
			return this.style.dropShadowBlur;
		},
		set: function (this: Text, val) {
			this.style.dropShadowBlur = val;
		}, configurable: true
	},
	'style.drShDistance': {
		get: function (this: Text) {
			return this.style.dropShadowDistance;
		},
		set: function (this: Text, val) {
			this.style.dropShadowDistance = val;
		}, configurable: true
	},
	'textTransform': {
		get: function (this: Text) {
			return (this as any)._textTransform;
		},
		set: function (this: Text, v) {
			if (v !== (this as any)._textTransform) {
				(this as any)._textTransform = v;
				if (v && (this as any)._text) {
					(this as any)._text = applyTextTransform((this as any)._text, this.textTransform);
					this.dirty = true;
				}
			}
		},
		configurable: true
	},
	'maxWidth': {
		get: function (this: Text) {
			return (this as any)._maxWidth;
		},
		set: function (this: Text, val) {
			if ((this as any)._maxWidth !== val) {
				(this as any)._maxWidth = val;
				recalculateTextSize(this);
			}
		}, configurable: true
	}
});

let d = Object.getOwnPropertyDescriptor(Text.prototype, 'text')!;
assert(d, 'Text component needs refactoring', 90001);
const originalTextSetter = d.set!;
d.set = function (this: Text, v) {
	if (this.textTransform && v) {
		/// #if EDITOR
		if (typeof v === 'number') {
			game.editor.ui.status.error('textTransform is set for label which shows numeric value. Please set it to "none" to avoid senseless processing.', 10075, this, 'textTransform');
			originalTextSetter.call(this, v);
			return;
		}
		/// #endif
		originalTextSetter.call(this, applyTextTransform(v, this.textTransform));
	} else {
		originalTextSetter.call(this, v);
	}
};
Object.defineProperty(Text.prototype, 'text', d);

let _original_onTextureUpdate = (Text.prototype as any)._onTextureUpdate;
(Text.prototype as any)._onTextureUpdate = function _onTextureUpdate() { // centred text with odd width is blurred bug fix
	checkAlignBlur(this);
	_original_onTextureUpdate.call(this);
	recalculateTextSize(this); // recalculate max width
};

Text.prototype.init = function () {
	/// #if EDITOR
	EDITOR_FLAGS._root_initCalled.delete(this);
	/// #endif
	if (this.translatableText) {
		this.text = L(this.translatableText);
	}
	recalculateTextSize(this);
};

/// #if EDITOR
Text.prototype.__beforeDestroy = function () {
	(this as any).textTransform = 0;
};
/// #endif

Text.prototype.onRemove = function () {
	/// #if EDITOR
	EDITOR_FLAGS._root_onRemovedCalled.delete(this);
	/// #endif
	(this as any)._maxWidth = 0;
	(this as any).textTransform = 0;
};

Text.prototype.setAlign = function (align: TextStyleAlign) {
	this.style.align = align;
};

function checkAlignBlur(text: Text) {
	let w = text.texture.width;
	if (w > 0) {
		if (text.style.align === CENTER) {
			text.anchor.x = Math.round(0.5 * w) / w;
		}
		let h = text.texture.height;
		if ((text.style as any)._verticalAlign === CENTER) {
			text.anchor.y = Math.round(0.5 * h) / h;
		}
	}
}

(Text.prototype as any).onLanguageChanged = function onLanguageChanged() {
	if ((this as any)._translatableText) {
		let t = (this as any)._translatableText;
		(this as any)._translatableText = null;
		this.translatableText = t;
	}
};

function _refreshAnchor(text: Text) {
	text.anchor.set(alignValues[text.style.align], alignValues[(text as any)._verticalAlign as 'top' | 'bottom' | 'center']);
}

function recalculateTextSize(text: Text) {
	if ((text as any)._maxWidth !== 0) {
		if (text._texture.width > (text as any)._maxWidth) {
			const q = (text as any)._maxWidth / text._texture.width;
			if (text.scale.x !== q || text.scale.y !== q) {
				text.scale.x = q;
				text.scale.y = q;
				if (text.parent) {
					text.updateTransform();
				}
			}
		} else {
			if (text.scale.x !== 1 || text.scale.y !== 1) {
				text.scale.x = 1;
				text.scale.y = 1;
				if (text.parent) {
					text.updateTransform();
				}
			}
		}
	}
}

/// #if EDITOR

function isColor(strColor: string, node: Text) {
	let s = new Option().style;
	s.color = strColor;
	if (s.color) {
		return true;
	} else {
		if (!game.__EDITOR_mode) {
			game.editor.ui.status.error('Wrong color gradient entry: ' + strColor, 32057, node, 'style.fill');
		}
	}
}


Text.prototype.__EDITOR_onCreate = function __EDITOR_onCreate() {
	this.text = 'New Text 1';
};

Text.prototype.__beforeSerialization = function __beforeSerialization() {
	if ((this as any)._translatableText) {
		this.text = '';
	}
	if (this.maxWidth > 0) {
		this.scale.x = 1;
		this.scale.y = 1;
	}
};
Text.prototype.__afterSerialization = function __afterSerialization() {
	if ((this as any)._translatableText) {
		this.text = L((this as any)._translatableText);
	}
	if (this.maxWidth > 0) {
		let tmp = this.maxWidth;
		this.maxWidth = 0;
		this.maxWidth = tmp;
	}
};

Text.__EDITOR_icon = 'tree/text';

_editableEmbed(Text, 'image', {
	type: 'string',
	override: true,
	visible: () => {
		return false;
	}
});

_editableEmbed(Text, 'text-props-splitter', {
	type: 'splitter',
	title: 'Text:'
});

_editableEmbed(Text, 'text', {
	default: null,
	type: 'string',
	title: 'Text:',
	important: true,
	multiline: true,
	disabled: (node: Text) => {
		return node.translatableText && 'Disabled because \'translatableText\' property is set.';
	}
});

_editableEmbed(Text, 'Edit text', {
	type: 'btn',
	helpUrl: 'components.Text#edit-text',
	title: 'Edit or create new translatable key.',
	onClick: (o: Text) => {
		LanguageView.editKey(o.translatableText);
	}
});

_editableEmbed(Text, 'translatableText', { type: 'l10n' });

_editableEmbed(Text, 'text-style', {
	type: 'splitter',
	title: 'Style:'
});

_editableEmbed(Text, 'Copy style', {
	type: 'btn',
	title: 'Copy text style.',
	onClick: (o: Text) => {
		const styleProperties = (o.constructor as SourceMappedConstructor).__editableProps
			.filter((property) => {
				return property.name.startsWith('style.');
			})
			.map((property) => ({ property: property.name, value: (o as KeyedObject)[property.name] }));
		game.editor.settings.setItem('__EDITOR-clipboard-data-text-style', styleProperties);
		game.editor.ui.modal.notify('Copied current text style');
	}
});

_editableEmbed(Text, 'Paste style', {
	type: 'btn',
	title: 'Paste text style.',
	onClick: (o: Text) => {
		game.editor.ui.modal.notify('Text style pasted');
		(game.editor.settings.getItem('__EDITOR-clipboard-data-text-style', []) as { property: string; value: any }[])
			.forEach(({ property, value }) => game.editor.onObjectsPropertyChanged(o, property, value, false));
	},
	visible: () => !!game.editor.settings.getItem('__EDITOR-clipboard-data-text-style', false),
});

_editableEmbed(Text, 'style.fontSize', {
	min: 1,
	max: 300,
	default: 24,
	important: true
});

_editableEmbed(Text, 'style.align', {
	select: [
		{ name: CENTER, value: CENTER },
		{ name: LEFT, value: LEFT },
		{ name: RIGHT, value: RIGHT },
		{ name: JUSTIFY, value: JUSTIFY }
	],
	default: CENTER
});

_editableEmbed(Text, 'verticalAlign', {
	select: [
		{ name: TOP, value: TOP },
		{ name: CENTER, value: CENTER },
		{ name: BOTTOM, value: BOTTOM }
	],
	type: 'string',
	default: CENTER
});

_editableEmbed(Text, 'style.fill', {
	type: 'string',
	default: '#ffffff'
});

_editableEmbed(Text, '___fill', {
	type: 'color',
	arrayProperty: true,
	notSerializable: true,
	default: [0xffffff]
});

_editableEmbed(Text, 'style.fillGradientStops', {
	type: 'number',
	arrayProperty: true,
	min: 0,
	max: 1,
	step: 0.001,
	visible: (node: Text) => {
		return (node as any)._styleFill && (node as any)._styleFill.indexOf(',') >= 0;
	}
});

_editableEmbed(Text, 'style.strokeThickness', {
	type: 'number',
	min: 0
});

_editableEmbed(Text, 'style.stroke', {
	type: 'color',
	noNullCheck: true,
	default: 0,
	visible: (node: Text) => {
		return node.style.strokeThickness > 0;
	}
});

_editableEmbed(Text, 'style.dropShadow', {
	type: 'boolean',
	default: false
});

_editableEmbed(Text, 'style.drShColor', {
	type: 'color',
	noNullCheck: true,
	default: 0,
	visible: (node: Text) => node.style.dropShadow
});

_editableEmbed(Text, 'style.drShAlpha', {
	type: 'number',
	default: 1,
	step: 0.01,
	min: 0,
	visible: (node: Text) => node.style.dropShadow
});

_editableEmbed(Text, 'style.drShAngle', {
	type: 'number',
	default: 0.524,
	step: 0.001,
	visible: (node: Text) => node.style.dropShadow
});

_editableEmbed(Text, 'style.drShBlur', {
	type: 'number',
	default: 0,
	step: 0.01,
	min: 0,
	visible: (node: Text) => node.style.dropShadow
});

_editableEmbed(Text, 'style.drShDistance', {
	type: 'number',
	default: 5,
	min: 0,
	visible: (node: Text) => node.style.dropShadow
});

_editableEmbed(Text, 'style.fontFamily', {
	type: 'string',
	beforeEdited(val) {
		const text = game.editor.selection[0] as Text;
		const currentWeight = text.style.fontWeight;
		const weights = getFontWeights(val);
		if (!weights.find(w => w.name === currentWeight)) {
			text.style.fontWeight = weights[Math.floor(weights.length / 2)].value;
		}
	}
});

function getFontWeights(family: string) {
	let availableWeights: KeyedObject = {};
	for (let f of Array.from(document.fonts.values())) {
		if (f.family === family) {
			let w = parseInt(f.weight);
			if (w < 301) {
				availableWeights.lighter = true;
			} else if (w > 801) {
				availableWeights.bolder = true;
			} else if (w > 501) {
				availableWeights.bold = true;
			} else {
				availableWeights.normal = true;
			}
		}
	}
	let a = Object.keys(availableWeights);
	if (a.length > 0) {
		return a.map((k) => {
			return { name: k, value: k as TextStyleFontWeight };
		});
	}
	return [
		{ name: 'normal', value: 'normal' },
		{ name: 'bold', value: 'bold' },
		{ name: 'bolder', value: 'bolder' },
		{ name: 'lighter', value: 'lighter' }
	] as { name: string; value: TextStyleFontWeight }[];
}

_editableEmbed(Text, 'style.fontWeight', {
	type: 'string',
	select: () => {
		const family = ((game.editor.selection[0] as Text).style.fontFamily as string).split(',')[0].replace(/['"]/gm, '').trim();
		return getFontWeights(family);
	},
	default: 'normal'
});

_editableEmbed(Text, 'style.leading', {
	type: 'number'
});

_editableEmbed(Text, 'style.padding', {
	type: 'number'
});

_editableEmbed(Text, 'style.letterSpacing', {
	type: 'number'
});

_editableEmbed(Text, 'textTransform', {
	type: 'number',
	select: Object.entries(TEXT_TRANSFORM).map(([name, value]) => ({ name, value })),
	default: TEXT_TRANSFORM.none
});

_editableEmbed(Text, 'maxWidth', {
	type: 'number',
	min: 0,
	afterEdited: (overrideO?: Text) => {
		let textObject = overrideO || game.editor.selection[0] as Text;
		let right = textObject.maxWidth;
		let y = 0;
		if (right === 0) {
			for (let t of game.editor.selection) {
				t.scale.x = 1;
				t.scale.y = 1;
			}
			___Guide.hide('maxWidthRight');
			___Guide.hide('maxWidthLeft');
		} else {
			switch (textObject.style.align) {
			case CENTER:
				right *= 0.5;
				y = -right;
				break;
			case RIGHT:
				right *= -1;
				break;
			}
			let tmpScale = textObject.scale.x;
			textObject.scale.x = 1;
			textObject.scale.y = 1;
			___Guide.show(right, 0, Math.PI / 2, 'maxWidthRight', textObject);
			___Guide.show(y, 0, Math.PI / 2, 'maxWidthLeft', textObject);
			textObject.scale.x = tmpScale;
			textObject.scale.y = tmpScale;
		}
	}
});
/// #endif
