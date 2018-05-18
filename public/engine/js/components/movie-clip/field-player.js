import call from "../../utils/call.js";

export default class FieldPlayer {
	
	init(target, data, pow, damper) {
		
		this.target = target;
		this.fieldName = data.n;
		this.timeline = data.t;
		this.pow = pow;
		this.damper = damper;
		this.reset();
	}
	
	reset() {
		this.time = 0;
		this.currentFrame = this.timeline[0];
		this.val = this.currentFrame.v;
		this.targetVal = this.val;
		this.currentTime = 0;
		this.speed = 0;
		this.target[this.fieldName] = this.val;
	}
	
	goto(time, nextKeyframe) {
		this.currentFrame = nextKeyframe;
		this.time = time;
	}
	
	update() {
		var currentFrame = this.currentFrame;
		if (this.time === currentFrame.t) {
//EDITOR
			this.__lastFiredKeyframe = currentFrame;
//ENDEDITOR
			var action;
			if (currentFrame.hasOwnProperty('a')) {
				action = currentFrame.a;
			}
			
			if(currentFrame.hasOwnProperty('s')) {
				this.speed = currentFrame.s;
			}
			
			if (currentFrame.m === 1 || currentFrame.m === 2) { //discrete and linear Mode fields apply exact value
				this.val = currentFrame.v;
			}
			
			this.time = currentFrame.j;
			this.currentFrame = currentFrame = currentFrame.n;
			if(currentFrame.m === 1) {// LINEAR Mode
				var dist = currentFrame.t - this.time;
				if(dist > 0) {
					this.speed = (currentFrame.v - this.val) / dist;
				} else {
					this.speed = 0;
				}
			} else if(currentFrame.m === 2) {// DISCRETE Mode
				this.speed = 0;
			}
			
			if (action) {
//EDITOR
				if(!this.__dontCallActions) {
					console.log('timeline CALL: ' + this.target.name + '; ' + currentFrame.t + '; ' + action);
//ENDEDITOR
					call(action, this.target);
//EDITOR
				}
//ENDEDITOR
				if(!this.target.isPlaying) {
					return;
				}
				
			}
			this.time++;
		} else {
			this.time++;
//EDITOR
			this.__lastFiredKeyframe = null;
//ENDEDITOR
		}


		if (currentFrame.m === 0) { //- SMOOTH
			this.speed += (currentFrame.v - this.val) * this.pow;
			this.speed *= this.damper;
		} else if(currentFrame.m === 3) { //JUMP FLOOR
			if(this.val >= currentFrame.v) {
				this.val = currentFrame.v;
				this.speed *= -currentFrame.b;
			} else {
				this.speed += currentFrame.g;
			}
		} else if(currentFrame.m === 3) { //JUMP ROOF
			if(this.val <= currentFrame.v) {
				this.val = currentFrame.v;
				this.speed *= -currentFrame.b;
			} else {
				this.speed -= currentFrame.g;
			}
		}
		this.val += this.speed;
		this.target[this.fieldName] = this.val;
		
	}
	
	//EDITOR
	__getValueForPreview(time) {
		this.reset();
		while (time > 0) {
			this.update();
			time--;
		}
		return this.val;
	}
	
	__serializeTimeline() {
		var keyframes = [];
		return {
			
		}
	}
	
	//ENDEDITOR
}
