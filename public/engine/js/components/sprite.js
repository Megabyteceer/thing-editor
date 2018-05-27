export default class DSprite extends PIXI.Sprite {
	constructor() {
		super();
		this.anchor.set(0.5);
		this.xSpeed = 0;
		this.ySpeed = 0;
		this.rSpeed = 0;
	}
	
	onRemove() {}
	
	update() {
		this.x += this.xSpeed;
		this.y += this.ySpeed;
		this.rotation += this.rSpeed;
	}
}

const imagePropertyDescriptor = {
	get:function () {
		return this._imageID;
	},
	set:function (v) {
		assert(typeof v === 'string', "texture's Srting ID expected.");
		if(this._imageID !== v) {
			this._imageID = v;
			this.texture = Lib.getTexture(v);
		}
	}
};

Object.defineProperty(PIXI.Sprite.prototype, 'image', imagePropertyDescriptor);
Object.defineProperty(PIXI.mesh.Mesh.prototype, 'image', imagePropertyDescriptor);



//EDITOR

var blendModesSelect = Object.keys(PIXI.BLEND_MODES).map((k) => {
	return {name: k, value: PIXI.BLEND_MODES[k]};
}).sort((a, b) => {
	return a.value - b.value
});

const tintRDesc = {
	get:function () {
		return this.tint >> 16;
	},
	set:function (v) {
		this.tint = (this.tint & 0xFFFF) | (v << 16);
	}, configurable: true
};

Object.defineProperty(PIXI.Sprite.prototype, 'tintR', tintRDesc);
Object.defineProperty(PIXI.mesh.Mesh.prototype, 'tintR', tintRDesc);

const tintGDesc = {
	get:function () {
		return (this.tint & 0xFF00) >> 8;
	},
	set:function (v) {
		this.tint = (this.tint & 0xFF00FF) | (v << 8);
	}, configurable: true
};

Object.defineProperty(PIXI.Sprite.prototype, 'tintG', tintGDesc);
Object.defineProperty(PIXI.mesh.Mesh.prototype, 'tintG', tintGDesc);

const tintBDesc = {
	get:function () {
		return this.tint & 0xFF;
	},
	set:function (v) {
		this.tint = (this.tint & 0xFFFF00) | v;
	}, configurable: true
};
	
Object.defineProperty(PIXI.Sprite.prototype, 'tintB', tintBDesc);
Object.defineProperty(PIXI.mesh.Mesh.prototype, 'tintB', tintBDesc);

PIXI.Sprite.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Sprite:',
		name: 'sprite'
	},
	makeImageSelectEditablePropertyDecriptor('image'),
	{
		name: 'tint',
		type: Number,
		default: 0xFFFFFF,
		max: 0xFFFFFF,
		min: 0
	},
	{
		name: 'tintR',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSeriazable: true
	},
	{
		name: 'tintG',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSeriazable: true
	},
	{
		name: 'tintB',
		type: Number,
		default: 255,
		max: 255,
		min: 0,
		notSeriazable: true
	},
	{
		name: 'blendMode',
		type: Number,
		select: blendModesSelect
	}
];

PIXI.mesh.Mesh.EDITOR_editableProps = PIXI.Sprite.EDITOR_editableProps;

DSprite.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Dynamic Sprite:',
		name: 'd-sprite'
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

DSprite.EDITOR_icon = 'tree/dsprite'
PIXI.Sprite.EDITOR_icon = 'tree/sprite'

//ENDEDITOR