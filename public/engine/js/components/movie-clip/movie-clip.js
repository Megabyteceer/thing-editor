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
		assert(!this._timelineData, "Timeline data already assigned for this MovieClip");
		assert(Array.isArray(data), "Wrong timeline data. Array expected");
		this.__timelineData = data;
		
		var pow = data.p; //smooth fields dynamic parameters
		var damper = data.d;
		
		var fieldsData = data.f;
		for(var i = 0; i < fieldsData.length; i++) {
			var p = Pool.create(FieldPlayer);
			p.reset(this, fieldsData[i], pow, damper);
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

MovieClip.__serializeTimelineData = (data) {
	
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


var labels = { //TODO:example
	show: {
		t:100,	//time to set for all frames
		n:[		//next frames for all fileds
			'frameRef_x',
			'frameRef_y',
			'frameRef_scale'
		
		]
	}
}