export default class PerspectiveSprite extends PIXI.mesh.Plane {
	
	constructor() {
		super(Lib.getTexture('WHITE'), 2 , 2);
		//this.vertices = [1,2,3,4,5,6,7,8];
		//this.uvs = [0,0,1,0,1,1,1,0];
	}
	
	update() {
		this.vertices[0] = Math.random() * -20;
		this.vertices[1] = Math.random() * 20;
	}
	
	get x0() {
		return this.vertices[0];
	}
	set x0(v) {
		this.vertices[0] = v;
	}
	get y0() {
		return this.vertices[1];
	}
	set y0(v) {
		this.vertices[1] = v;
	}
	get x1() {
		return this.vertices[2];
	}
	set x1(v) {
		this.vertices[2] = v;
	}
	get y1() {
		return this.vertices[3];
	}
	set y1(v) {
		this.vertices[3] = v;
	}
	get x2() {
		return this.vertices[4];
	}
	set x2(v) {
		this.vertices[4] = v;
	}
	get y2() {
		return this.vertices[5];
	}
	set y2(v) {
		this.vertices[5] = v;
	}
	get x3() {
		return this.vertices[6];
	}
	set x3(v) {
		this.vertices[6] = v;
	}
	get y3() {
		return this.vertices[7];
	}
	set y3(v) {
		this.vertices[7] = v;
	}
}
PerspectiveSprite.EDITOR_icon = 'tree/perspective'
PerspectiveSprite.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Vertices:',
		name: 'vertices'
	},
	{
		name: 'x0',
		type: Number
	},
	{
		name: 'y0',
		type: Number
	},{
		name: 'x1',
		type: Number
	},
	{
		name: 'y1',
		type: Number
	},{
		name: 'x2',
		type: Number
	},
	{
		name: 'y2',
		type: Number
	},{
		name: 'x3',
		type: Number
	},
	{
		name: 'y3',
		type: Number
	}
];
