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
		this.currentFrame = data.t[0];
		this.val = this.timeline[0].v;
		this.targetVal = this.val;
		this.currentTime = 0;
		if(this.currentFrame.hasOwnProperty('s')) {
			this.speed = this.currentFrame.s;
		} else {
			this.speed = 0;
		}
	}
	
	goto(time, nextKeyframe) {
		this.currentFrame = nextKeyframe;
		this.time = time;
	}
	
	update() {
		var currentFrame = this.currentFrame;
		if (this.time === currentFrame.t) {

			if (currentFrame.hasOwnProperty('c')) {
				console.log('timeline CALL: ' + this.target.name + '; '+ currentFrame.t + '; ' + currentFrame.c );
				call(this.currentFrame.call, target);
			}
			
			if (currentFrame.m !== 0) { //discrete and linear fields apply exact value
				this.val = currentFrame.v;
			}
			
			this.time = currentFrame.j;
			this.currentFrame = currentFrame = currentFrame.n;
			
			currentFrame
		}
		
		
		if (type === 0) {
			if (currentFrame.smooth != 2) {
				speed += (targetVal-currentValue) * this.pow;
				speed *= this.damper;
			}
			
			currentValue += speed;
			if (setter != null) {
				setter(currentValue);
			} else {
				this.val = this.currentValue;
			}
			
		}
		
		target[this.fieldName] = this.val;
		this.time++;
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
