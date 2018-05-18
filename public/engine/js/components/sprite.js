export default class Sprite extends PIXI.Sprite {
	constructor() {
		super();
		this.anchor.set(0.5);
		this.xSpeed = 0;
		this.ySpeed = 0;
		this.rSpeed = 0;
		
		this.texture = Lib.getTexture('bunny'); //TODO: remove this temporary texture assigning
	}
	
	onRemove() {}
	
	update() {
		this.x += this.xSpeed;
		this.y += this.ySpeed;
		this.rotation += this.rSpeed;
	}
}


//EDITOR

var blendModesSelect = Object.keys(PIXI.BLEND_MODES).map((k) => {
	return {name: k, value: PIXI.BLEND_MODES[k]};
}).sort((a, b) => {
	return a.value - b.value
});

var imagePropertySelect = {
	name: 'image',
	type: String,
	default: 'EMPTY'
}
Object.defineProperty(imagePropertySelect, 'select', {
	get:() => {
		return Lib.__texturesList;
	}
})

Object.defineProperty(PIXI.Sprite.prototype, 'image', {
	get:function () {
		return this._imageID;
	},
	set:function (v) {
		if(this._imageID !== v) {
			this._imageID = v;
			this.texture = Lib.getTexture(v);
		}
	}
});

PIXI.Sprite.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Sprite:',
		name: 'sprite'
	},
	imagePropertySelect,
	{
		name: 'tint',
		type: Number,
		default: 0xFFFFFF,
		max: 0xFFFFFF,
		min: 0
	},
	{
		name: 'blendMode',
		type: Number,
		select: blendModesSelect
	}
];

Sprite.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Speed:',
		name: 'speed'
	},
	{
		name: 'xSpeed',
		type: Number,
		step: 0.001
	},
	{
		name: 'ySpeed',
		type: Number,
		step: 0.001
	},
	{
		name: 'rSpeed',
		type: Number,
		step: 0.0001
	}
];




Sprite.EDITOR_icon = 'tree/sprite'

//ENDEDITOR