import { BLEND_MODES, Mesh, Sprite } from "pixi.js";
import type { KeyedObject, SelectableProperty, SourceMappedConstructor } from "thing-editor/src/editor/env";
import { _editableEmbed } from "thing-editor/src/editor/props-editor/editable";
import makeImageSelectEditablePropertyDescriptor from "thing-editor/src/editor/ui/props-editor/make-image-property-desc";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

export default Sprite;

const imageJSPropertyDescriptor = {
	get: function (this: Sprite) {
		return this._imageID;
	},
	set: function (this: Sprite, v: string) {
		assert(typeof v === 'string', "texture's String ID expected.", 10022);
		if(this._imageID !== v) {
			this._imageID = v;
			this.texture = Lib.getTexture(v
				/// #if EDITOR
				, this
				/// #endif
			);
			assert(this.texture && this.texture.baseTexture, "baseTexture is empty.");
			/// #if EDITOR
			if(this.texture.valid && (Lib.hasTexture(this._imageID))) {
				if(this.anchor && ((((this.texture.height & 1) !== 0) && this.anchor.x === 0.5) || (((this.texture.width & 1) !== 0) && this.anchor.y === 0.5))) {
					game.editor.ui.status.warn('Texture "' + v + '" has non even sized bounds ('
						+ this.texture.width + 'x' + this.texture.height + '). It is can cause unwanted blurring for objects with centralized pivot point.', 32028,
						() => {
							// fs.editFile(game.resourcesPath + 'img/' + v); TODO: keep file desc in texture and get fill path there
						});
				}
			}
			/// #endif
		}
	}
};

Object.defineProperty(Sprite.prototype, 'image', imageJSPropertyDescriptor);
Object.defineProperty(Mesh.prototype, 'image', imageJSPropertyDescriptor);

export { imageJSPropertyDescriptor as imagePropertyDescriptor };

const tintRDesc = {
	get: function (this: Sprite) {
		return this.tint >> 16;
	},
	set: function (this: Sprite, v: number) {
		assert(!isNaN(v), "invalid value for 'tintR'. Valid number value expected.", 10001);
		this.tint = (this.tint & 0xFFFF) | (v << 16);
	}, configurable: true
};

Object.defineProperty(Sprite.prototype, 'tintR', tintRDesc);
Object.defineProperty(Mesh.prototype, 'tintR', tintRDesc);

const tintGDesc = {
	get: function (this: Sprite) {
		return (this.tint & 0xFF00) >> 8;
	},
	set: function (this: Sprite, v: number) {
		assert(!isNaN(v), "invalid value for 'tintG'. Valid number value expected.", 10001);
		this.tint = (this.tint & 0xFF00FF) | (v << 8);
	}, configurable: true
};

Object.defineProperty(Sprite.prototype, 'tintG', tintGDesc);
Object.defineProperty(Mesh.prototype, 'tintG', tintGDesc);

const tintBDesc = {
	get: function (this: Sprite) {
		return this.tint & 0xFF;
	},
	set: function (this: Sprite, v: number) {
		assert(!isNaN(v), "invalid value for 'tintB'. Valid number value expected.", 10001);
		this.tint = (this.tint & 0xFFFF00) | v;
	}, configurable: true
};

Object.defineProperty(Sprite.prototype, 'tintB', tintBDesc);
Object.defineProperty(Mesh.prototype, 'tintB', tintBDesc);


/// #if EDITOR

Sprite.prototype.__beforeDestroy = function () {
	assert(this._width === 0, "width property was assigned but not cleared to zero on object disposing.", 10065);
	assert(this._height === 0, "height property was assigned but not cleared to zero on object disposing.", 10066);
};

(Sprite.prototype.destroy as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Mesh.prototype.destroy as SelectableProperty).___EDITOR_isHiddenForChooser = true;

Sprite.prototype.__EDITOR_onCreate = function (isWrapping) {
	if(!isWrapping && game.editor.projectDesc.icon.startsWith('img/')) {
		this.image = game.editor.projectDesc.icon.replace('img/', '');
	}
};
Mesh.prototype.__EDITOR_onCreate = Sprite.prototype.__EDITOR_onCreate;

const blendModesSelect = Object.keys(BLEND_MODES).filter((k) => {
	return isNaN(parseInt(k));
}).map((k) => {
	return { name: k, value: (BLEND_MODES as KeyedObject)[k] };
}).sort((a, b) => {
	return a.value - b.value;
});

(Sprite as any as SourceMappedConstructor).__EDITOR_icon = 'tree/sprite';

_editableEmbed([Sprite, Mesh as any], 'image', makeImageSelectEditablePropertyDescriptor('image', false, true));
_editableEmbed([Sprite, Mesh as any], 'tint', {
	basis: 16,
	default: 0xFFFFFF,
	max: 0xFFFFFF,
	min: 0,
	notAnimate: true
});
_editableEmbed([Sprite, Mesh as any], 'tintR', {
	default: 255,
	max: 255,
	min: 0,
	notSerializable: true
});
_editableEmbed([Sprite, Mesh as any], 'tintG', {
	default: 255,
	max: 255,
	min: 0,
	notSerializable: true
});
_editableEmbed([Sprite, Mesh as any], 'tintB', {
	default: 255,
	max: 255,
	min: 0,
	notSerializable: true
});
_editableEmbed([Sprite, Mesh as any], 'blendMode', {
	select: blendModesSelect,
	notAnimate: true
});

/// #endif
