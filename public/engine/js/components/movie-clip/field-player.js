export default class FieldPlayer {
	
	reset(target, data, pow, pamper) {
		
		this.target = target;
		this.fieldName = data.n;
		this.timeline = data.t;
		this.time = 0;
		this.currentFrame = data.t[0];
		this.discrete = data.d;
		if(!data.d) {
			this.pow = pow;
			this.pamper = pamper;
			this.val = target[this.fieldName];
			this.targetVal = this.val;
			this.speed = 0;
		}
		
		this.currentTime = 0;
	}
	
	goto(time, nextKeyframe) {
		this.currentFrame = nextKeyframe;
		this.time = time;
	}
	
	update() {
		
		
	}
	
	//EDITOR
	__getValueForPreview(time) {
		var frames = this.timeline;
		var prevFrame = frames[0];
		var i = 0;
		while ((i < frames.length) && frames[i].t < time) {
			prevFrame = frames[i];
			i++;
		}
		if (i >= frames.length || this.discrete) {
			return prevFrame.v;
		}
		
		var curFrame = frames[i];

		var q = (time-prevFrame.t) / (curFrame.t-prevFrame.t);
		return curFrame.v * q + prevFrame.v * (1.0 - q);
	}
	
	__serializeTimeline() {
		var keyframes = [];
		
		return {
			
		}
	}
	
	//ENDEDITOR
}


var fieldAnimationDataSerialized =  //TODO: example. will be removed
[
	{
		v:2,	//target value
		t:1,	//frame time
		m:0,	//mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE
		j:120,		//time to jump. If no jump - equal to 't'
		n:'frameRef'	//next keyFrame
	}
]

