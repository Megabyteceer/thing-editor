class Sprite extends PIXI.Sprite {
	constructor(pic) {
		super(pic);
		this.anchor.set(0.5);
		this.xSpeed = 0;
		this.ySpeed = 0;
		this.rSpeed = 0;
	}
	
	update() {
		this.x += this.xSpeed;
		this.y += this.ySpeed;
		this.rotation += this.rSpeed;
	}
}	var blendModesSelect = Object.keys(PIXI.BLEND_MODES).map((k) => {
	return {name: k, value: PIXI.BLEND_MODES[k]};
}).sort((a, b) => {
	return a.value - b.value
});

PIXI.Sprite.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Sprite:',
		name: 'sprite'
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
	
	//TODO: image, tint
];

export default Sprite;

Sprite.EDITOR_icon = 'tree/sprite'