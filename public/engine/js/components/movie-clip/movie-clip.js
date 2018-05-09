import Sprite from '../sprite.js';
import Pool from "../../utils/pool.js";
import FieldPlayer from "./field-player.js";

export default class MovieClip extends Sprite {
	
	constructor() {
		super();
		this.fieldPlayers = [];
	}
	
	onRemove() {
		while (this.fieldPlayers.length > 0) {
			Pool.dispose(this.fieldPlayers.pop());
		}
		this.__timelineData = null;
	}
	
	update() {
		if (this.isPlaying) {
			if (delay > 0) {
				delay--;
			} else {
				for(var p in this.fieldPlayers) {
					p.update();
				}
			}
		}
		super.update();
	}
	
	get timelineData() {
		return this._timelineData;
	}
	
	set timelineData(data) {
		
		data = fakeTmpData;
		
		assert(!this._timelineData, "Timeline data already assigned for this MovieClip");
		assert(Array.isArray(data), "Wrong timeline data. Array expected");
		this.__timelineData = data;
		
		var pow = data.p; //smooth fields dynamic parameters
		var damper = data.d;
		
		var fieldsData = data.f;
		for(var i = 0; i < fieldsData.length; i++) {
			var p = Pool.create(FieldPlayer);
			p.init(this, fieldsData[i], pow, damper);
		}
	}
	
	gotoLabel(labelName) {
		var label = this.labels[labelName];
		let l = label.n;
		for(let i =0; i < l; i++) {
			this.fieldPlayers[i].goto(label.t, label.n[i]);
		}
	}
	
	play() {
		isPlaying = true;
	}
	
	stop() {
		isPlaying = false;
	}
	
	playRecursive() {
		for (var c in this.findChildrenByType(MovieClip)) {
			c.isPlaying = true;
		}
	}
	
	stopRecursive() {
		for (var c in this.findChildrenByType(MovieClip)) {
			c.isPlaying = false;
		}
	}
}

//EDITOR

MovieClip.__serializeTimelineData = (data) => {
	
	return {}
}

MovieClip.EDITOR_icon = 'tree/movie';
MovieClip.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'MovieClip:',
		name: 'movieclip'
	},
	{
		name: 'isPlaying',
		type: Boolean,
		default: true
	},
	{
		name: 'delay',
		type: Number,
		min: 0
	},
	{
		name: 'timeline',
		type: 'timelineData'
	}
];

//ENDEDITOR

//TODO: example. will be removed

var filedsTimelines = [
	{
		n: 'x',
		t: [
			{
				v: 250,
				t: 0,
				m: 0,
				j: 0
			},
			{
				v: 100,	//target Value
				t: 100,	//frame triggering Time
				m: 0,	//Mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE
				j: 100,	//Jump to time. If no jump need - equal to 't'
				s: 0,	//multiply current Speed
				d: -3,	//Delta current speed. (active if 's' is existing only). If need abs speed set. multiply current speed by 0 first.
				n: 'frameRef'	//next keyFrame
			},
			{
				v: 300,
				t: 200,
				m: 0,
				j: 200
			},
			{
				v: 200,
				t: 254,
				m: 0,
				j: 1
			}
		]
	},
	{
		n: 'y',
		t: [
			{
				v: 250,
				t: 0,
				m: 0,
				j: 0
			},
			{
				v: 320,
				t: 122,
				m: 0,
				j: 122
			},
			{
				v: 260,
				t: 254,
				m: 0,
				j: 254
			},
			{
				v: 160,
				t: 334,
				m: 0,
				j: 334
			},
			{
				v: 360,
				t: 397,
				m: 0,
				j: 1
			}
		]
	}
];


const loopFrames = (a) => {
	a = a.t;
	var i = 1;
	while(i < a.length) {
		a[i-1].n = a[i];
		i++;
	}
	a[a.length-1].n = a[1];
}
loopFrames(filedsTimelines[0]);
loopFrames(filedsTimelines[1]);

var labels = {
	start: {
		t:0,	//time to set for all frames
		n: [	//next frames for all fileds
			filedsTimelines[0].t[0],
			filedsTimelines[1].t[0]
		]
	}
}

var fakeTmpData = {
	l:labels,
	p:0.01,
	d:0.9,
	f:filedsTimelines
}