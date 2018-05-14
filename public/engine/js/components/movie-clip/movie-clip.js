import Sprite from '../sprite.js';
import Pool from "../../utils/pool.js";
import FieldPlayer from "./field-player.js";

export default class MovieClip extends Sprite {
	
	constructor() {
		super();
		this.fieldPlayers = [];
	}
	
	onRemove() {
		this._timelineData = null;
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

//EDITOR
//timeline reading has sense in editor mode only
	get timeline() { //serialize timeline to save in Lib as json. Replace keyframes references to indexes
		if(!this._timelineData || editor.ui.propsEditor.__isPropsRenderingAccessTime) {
			return null;
		}
		if(!serializeCache.has(this._timelineData)) {
			console.warn("MovieClip serialization invoked >>>");
			var tl = this._timelineData;
			var fields = tl.f.map((f) => {
				return {
					n: f.n,
					t: f.t.map((k) => {
						var ret = Object.assign({}, k);
						if(ret.j === ret.t) {
							delete(ret.j);
						}
						if(ret.m === 0) {
							delete ret.m;
						}
						delete ret.n;
						return ret;
					})
				};
			});

			var labels = {};
			for(let key in tl.l) {
				var label = tl.l[key];
				labels[key] = label.t;
			}
			var c = {
				l: labels,
				p: tl.p,
				d: tl.d,
				f: fields
			}
			serializeCache.set(this._timelineData, c);
		}
		return serializeCache.get(this._timelineData);
	}
//ENDEDITOR

	static _findNextField (timeLineData, time) {
		var ret = timeLineData[0];
		for(let f of timeLineData) {
			if(f.t > time) {
				return f;
			}
			ret = f;
		}
		return ret;
	}
	
	static _deserializeTimelineData(tl) {
		console.warn("MovieClip deserialization invoked <<<");

		var fields = tl.f.map((f) => {
			
			var fieldTimeline = f.t.map((k) => {
				var ret =  Object.assign({}, k);
				if(!ret.hasOwnProperty('j')) {
					ret.j = ret.t;
				}
				if(!ret.hasOwnProperty('m')) {
					ret.m = 0; //- SMOOTH
				}
				return ret;
			});
			for(let f of fieldTimeline) {
				f.n = MovieClip._findNextField(fieldTimeline, f.j);
			}
			return {
				n: f.n,
				t: fieldTimeline
			};
		});
		
		var labels = {};
		for(let key in tl.l) {
			var labelTime = tl.l[key].t;
			var nexts = fields.map((field) => {
				return MovieClip._findNextField(field.t, labelTime-1);
			});
			labels[key] = {t: labelTime, n: nexts};
		}
		return {
			l: labels,
			p: tl.p,
			d: tl.d,
			f: fields
		};
	}

	set timeline(data) {
		if(data === null) return;
//EDITOR
		if(!deserializeCache.has(data)) {
			var desData = MovieClip._deserializeTimelineData(data);
			deserializeCache.set(data, desData)
			serializeCache.set(desData, data);
		}
		data = deserializeCache.get(data);
//ENDEDITOR
		
		data = fakeTmpData; //TODO: remove fake data
		
		assert(!this._timelineData || game.__EDITORmode, "Timeline data already assigned for this MovieClip");
		assert(Array.isArray(data.f), "Wrong timeline data?");
		this._timelineData = data;

		var pow = data.p; //smooth fields dynamic parameters
		var damper = data.d;
		
		while (this.fieldPlayers.length > 0) {
			Pool.dispose(this.fieldPlayers.pop());
		}
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

var deserializeCache = new WeakMap();
var serializeCache = new WeakMap();

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
				v: 1,
				t: 0,
				m: 1,
				j: 0
			},
			{
				v: 100,	//target Value
				t: 100,	//frame triggering Time
				m: 0,	//Mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE
				j: 100,	//Jump to time. If no jump need - equal to 't'
				s: 0,	//set current Speed
				n: 'frameRef'	//next keyFrame
			},
			{
				v: 300,
				t: 200,
				m: 1,
				j: 200,
				s: 50
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
				v: 2,
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
				v: -0.1,
				t: 0,
				m: 0,
				j: 0
			}, {
				v: 0.1,
				t: 20,
				m: 0,
				j: 20
			}, {
				v: -0.1,
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
	d:0.85,
	f:filedsTimelines
}