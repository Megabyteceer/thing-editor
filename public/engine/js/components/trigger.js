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
		
		this.alpha = 1 - q * this.disabledAlpha;
		
		this.visible = this.alpha < 0.01;
		
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

/// #if EDITOR

import Tip from "/editor/js/utils/tip.js";

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
		important: true,
		tip: Tip.tips.pathFieldTip
	},
	{
		name: 'invert',
		type: Boolean
	},
	{
		name: 'animationLength',
		type: Number,
		min: 1,
		default:10,
		tip:`Switch transition duration in frames.
Set <b>1</b> - to swich visibility <b>instantly</b>.`
	},
	{
		name: 'disabledAlpha',
		type: Number,
		min:0,
		max:1,
		default: 1,
		step: 0.01,
		tip: `<b>Triggers transparency transition:</b>
<b>1</b> - make fully invisible when state is 'false';
<b>0.5</b> - make half visible when state id 'false';
<b>0</b> - don't disturb alpha;`
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

Trigger.EDITOR_tip = `<b>Trigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> accordingly of value of specified javaScript variable.`;

/// #endif