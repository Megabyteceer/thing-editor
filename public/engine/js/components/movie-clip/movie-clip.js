import Sprite from '../sprite.js';
import Pool from "../../utils/pool.js";
import FieldPlayer from "./field-player.js";

export default class MovieClip extends Sprite {
	
	constructor() {
		super();
		this.fieldPlayers = [];
	}
	
	update() {
		if (this.isPlaying) {
			if (this.delay > 0) {
				this.delay--;
			} else {
				for(var p of this.fieldPlayers) {
					if (this.isPlaying) {
						p.update();
					}
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

	static invalidateSerializeCache (timelineData) {
		deserializeCache.delete(serializeCache.get(timelineData));
		serializeCache.delete(timelineData);
	}
//ENDEDITOR

	static _findNextKeyframe (timeLineData, time) {
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
				f.n = MovieClip._findNextKeyframe(fieldTimeline, f.j);
			}
			return {
				n: f.n,
				t: fieldTimeline
			};
		});
		
		var labels = {};
		for(let key in tl.l) {
			var labelTime = tl.l[key];
			var nexts = fields.map((field) => {
				return MovieClip._findNextKeyframe(field.t, labelTime - 1);
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
		if(!deserializeCache.has(data) || editor.disableFieldsCache) {
			var desData = MovieClip._deserializeTimelineData(data);
			deserializeCache.set(data, desData)
			serializeCache.set(desData, data);
		}
		data = deserializeCache.get(data);
//ENDEDITOR
		
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
	
	resetTimeline() {
		for (let p of this.fieldPlayers) {
			p.reset();
		}
	}
	
	hasLabel(labelName) {
		return this._timelineData.l.hasOwnProperty(labelName);
	}
	
	gotoLabel(labelName) {
		var label = this._timelineData.l[labelName];
		let l = this.fieldPlayers.length;
		for(let i =0; i < l; i++) {
			this.fieldPlayers[i].goto(label.t, label.n[i]);
		}
	}
	
	play() {
		this.isPlaying = true;
	}
	
	stop() {
		this.isPlaying = false;
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