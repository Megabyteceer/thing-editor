
import { NineSlicePlane as PIXI_NineSlicePlane } from 'pixi.js';
import { _editableEmbed } from 'thing-editor/src/editor/props-editor/editable';
import Lib from 'thing-editor/src/engine/lib';

export default class NineSlicePlane extends PIXI_NineSlicePlane {
	constructor() {
		super(Lib.getTexture('WHITE'), 3, 3, 3, 3);
	}

	/// #if EDITOR
	__beforeDeserialization() {
		this.image = 'WHITE';
	}
	/// #endif
}

/// #if EDITOR

NineSlicePlane.__EDITOR_icon = 'tree/slice9';
_editableEmbed(NineSlicePlane, 'width', {
	noNullCheck: true,
	default: 200
});
_editableEmbed(NineSlicePlane, 'height', {
	noNullCheck: true,
	default: 200
});
_editableEmbed(NineSlicePlane, 'leftWidth', {
	noNullCheck: true,
	default: 5
});
_editableEmbed(NineSlicePlane, 'rightWidth', {
	noNullCheck: true,
	default: 5
});
_editableEmbed(NineSlicePlane, 'topHeight', {
	noNullCheck: true,
	default: 5
});
_editableEmbed(NineSlicePlane, 'bottomHeight', {
	noNullCheck: true,
	default: 5
});

/// #endif
