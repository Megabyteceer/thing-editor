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
		this._timeline = null;
	}
	
	update() {
		if (this.isPlaying) {
			if (this.delay > 0) {
				this.delay--;
			} else {
				for(var p of this.fieldPlayers) {
					p.update();
				}
			}
		}
		super.update();
	}
	
	get timeline() {
		return this._timeline;
	}
	
	set timeline(data) {
		
		data = fakeTmpData;
		
		assert(!this._timeline, "Timeline data already assigned for this MovieClip");
		assert(Array.isArray(data.f), "Wrong timeline data?");
		this._timeline = data;
		
		var pow = data.p; //smooth fields dynamic parameters
		var damper = data.d;
		
		var fieldsData = data.f;
		for(var i = 0; i < fieldsData.length; i++) {
			var p = Pool.create(FieldPlayer);
			p.init(this, fieldsData[i], pow, damper);
			this.fieldPlayers.push(p);
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
		type: 'timeline'
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
				m: 1,
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
				m: 1,
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
				m: 1,
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
				m: 1,
				j: 1
			}
		]
	},
	{
		n: 'rotation',
		t: [
			{
				v: -0.4,
				t: 0,
				m: 0,
				j: 0
			}, {
				v: 0.4,
				t: 20,
				m: 0,
				j: 20
			}, {
				v: -0.4,
				t: 40,
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
loopFrames(filedsTimelines[2]);

var labels = {
	start: {
		t:0,	//time to set for all frames
		n: [	//next frames for all fileds
			filedsTimelines[0].t[0],
			filedsTimelines[1].t[0],
			filedsTimelines[2].t[0]
		]
	}
}

var fakeTmpData = {
	l:labels,
	p:0.02,
	d:0.8,
	f:filedsTimelines
}