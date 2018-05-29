import Container from './container.js';
import getValueByPath from "../utils/get-value-by-path.js";

export default class Trigger extends Container {
	
	init() {
		this.initialScale = this.scale.x;
		this.initialX = this.x;
		this.initialY = this.y;
		this.stepsToShow = Math.floor()
		if (this.dataPath) {
			this.state = this.getState();
		}
		if (!this.state) {
			this.phase = this.animationLength;
		} else {
			this.phase = 0;
		}
		this.interactiveChildren = this.state;
		this.updatePhase();
	}
	
	getState() {
		var s = getValueByPath(this.dataPath);
		if (this.invert) {
			return !s;
		}
		return s;
	}
	
	show() {
		this.state = true;
		this.interactiveChildren = true;
	}
	
	hide() {
		this.state = false;
		this.interactiveChildren = false;
	}
	
	toggle() {
		this.state = !this.state;
	}
	
	updatePhase() {
		var q = this.phase / this.animationLength;
		this.visible = (q !== 1);
		if (this.animateAlpha) {
			this.alpha = 1 - q;
		}
		if (this.scaleSpeed !== 0) {
			var s = this.initialScale - q * this.scaleSpeed;
			this.scale.x = s;
			this.scale.y = s;
		}
		if (this.xSpeed !== 0) {
			this.x = this.initialX + q * this.xSpeed;
		}
		if (this.ySpeed !== 0) {
			this.y = this.initialY + q * this.ySpeed;
		}
	}
	
	update() {
		if (this.dataPath) {
			this.state = this.getState();
		}
		this.interactiveChildren = this.state;
		if (this.state) {
			if (this.phase > 0) {
				
				this.phase--;
				this.updatePhase();
			}
		} else {
			if (this.phase < this.animationLength) {
				this.phase++;
				this.updatePhase();
			}
		}
	}
}

//EDITOR

Trigger.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Trigger:',
		name: 'trigger'
	},
	{
		name: 'state',
		type: Boolean
	},
	{
		name: 'dataPath',
		type: String,
		important: true
	},
	{
		name: 'invert',
		type: Boolean
	},
	{
		name: 'animationLength',
		type: Number,
		min: 1,
		default:10
	},
	{
		name: 'animateAlpha',
		type: Boolean,
		default: true
	},
	{
		name: 'scaleSpeed',
		type: Number,
		step: 0.001,
		min:-1,
		max:1
	},
	{
		name: 'ySpeed',
		type: Number,
		step: 0.1
	},
	{
		name: 'xSpeed',
		type: Number,
		step: 0.1
	}
];

Trigger.EDITOR_icon = 'tree/trigger';

//ENDEDITOR