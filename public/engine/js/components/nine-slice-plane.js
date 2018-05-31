export default class NineSlicePlane extends PIXI.mesh.NineSlicePlane {
	
	constructor() {
		super(Lib.getTexture('WHITE'), 3,3,3,3);
	}
	
	
}

/// #if EDITOR
NineSlicePlane.EDITOR_group = 'Basic';
NineSlicePlane.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Nine-slice:',
		name: 'nine-slice'
	},
	{
		name: 'width',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'height',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'leftWidth',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'rightWidth',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'topHeight',
		type: Number,
		noNullCheck: true
	},
	{
		name: 'bottomHeight',
		type: Number,
		noNullCheck: true
	}
];

NineSlicePlane.EDITOR_icon = 'tree/slice9';

/// #endif