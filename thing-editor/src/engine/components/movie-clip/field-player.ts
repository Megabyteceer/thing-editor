/// #if EDITOR
import game from "thing-editor/src/engine/game.js";
/// #endif

import { KeyedMap, KeyedObject } from "thing-editor/src/editor/env.js";
import MovieClipP from "thing-editor/src/engine/components/movie-clip/movie-clip.c.js";
import callByPath from "../../utils/call-by-path.js";

enum TimelineKeyFrameMode {
	SMOOTH = 0,
	LINEAR = 1,
	DISCRETE = 2,
	BOUNCE_BOTTOM = 3,
	BOUNCE_TOP = 4,
}


interface TimelineKeyFrame {

	m: TimelineKeyFrameMode;

	/** next keyframe */
	n: TimelineKeyFrame;

	/** target value */
	v: number;

	/** set speed */
	s: number;

	/** time */
	t: number

	/** time to jump (loop time) */
	j: number;

	/** random delay (max random value to decrease distance to next keyframe */
	r: number;

	/** action (callback) */
	a: string;

	/** power of gravity for BOUNCE keyframes */
	g: number;

	/** bouncing power for BOUNCE keyframes */
	b: number;

	/// #if EDITOR
	___react_id?: number; //TODO rename to ___viewId;

	/// #endif
}

type Partial<T> = {
	[P in keyof T]?: T[P];
};

type TimelineSerializedKeyFrame = Partial<TimelineKeyFrame>;

type NumericArray = number[];
interface TimelineFrameValuesCache extends NumericArray {
	min?: number;
	max?: number;
};


interface TimelineFieldData {
	/** name of property to animate */
	n: string;

	t: TimelineKeyFrame[];

	/// #if EDITOR
	___timelineData: TimelineData;
	___fieldIndex: number;
	___cacheTimeline?: TimelineFrameValuesCache;
	/// #endif

}

interface TimelineSerializedFieldData {
	/** name of property to animate */
	n: string;

	t: TimelineSerializedKeyFrame[];
}



interface TimelineLabelData {

	/** labels time */
	t: number;

	/** next kayframe for each FiledPlayer */
	n: TimelineKeyFrame[];
}

type TimelineSerializedLabelsData = KeyedMap<number>;

interface TimelineSeriallizedData {
	/** labels */
	l: TimelineSerializedLabelsData;

	/** fileds animation */
	f: TimelineSerializedFieldData[];

	/** pow */
	p: number;

	/** damp */
	d: number;
}

interface TimelineData {

	/** labels */
	l: KeyedMap<TimelineLabelData>;

	/** pow */
	p: number;

	/** damp */
	d: number;

	f: TimelineFieldData[];
}


export default class FieldPlayer {

	target!: MovieClipP;
	fieldName!: string;
	timeline!: TimelineKeyFrame[];
	pow = 0;
	damper = 0;
	time = 0;
	currentFrame!: TimelineKeyFrame;
	val: any;
	targetVal?: number;
	speed = 0;

	/// #if DEBUG

	__processedTime?: number = undefined;

	__lastFiredKeyframe?: TimelineKeyFrame;

	/** prevent call actions during timeline chart rendering */
	__doNotCallActions?: boolean;

	/// #endif

	init(target: MovieClipP, data: TimelineFieldData, pow: number, damper: number) {

		this.target = target;
		this.fieldName = data.n;
		this.timeline = data.t;
		this.pow = pow;
		this.damper = damper;
		this.reset();
	}

	reset(
		/// #if EDITOR
		ignoreRandom = false
		/// #endif
	) {
		this.time = 0;
		/// #if DEBUG
		this.__processedTime = undefined;
		/// #endif
		this.currentFrame = this.timeline[0];
		if(this.currentFrame.hasOwnProperty('r')
			/// #if EDITOR
			&& !ignoreRandom
			/// #endif
		) {
			this.time += Math.round(Math.random() * this.currentFrame.r);
		}
		this.val = this.currentFrame.v;
		this.targetVal = this.val;
		this.speed = 0;

		/// #if EDITOR
		if(game.__EDITOR_mode && this.target.__previewFrame) {
			let kf = this.timeline.find((kf) => {
				return kf.t >= this.target.__previewFrame;
			}) || this.timeline[this.timeline.length - 1];
			if(kf) {
				(this.target as KeyedObject)[this.fieldName] = kf.v;
				return;
			}
		}
		/// #endif
		(this.target as KeyedObject)[this.fieldName] = this.val;
	}

	goto(time: number, nextKeyframe: TimelineKeyFrame) {
		this.time = time;
		this.currentFrame = nextKeyframe;
		if(nextKeyframe.m === 1) { //LINEAR
			let dist = nextKeyframe.t - this.time;
			if(dist > 0) {
				this.speed = (nextKeyframe.v - this.val) / dist;
			} else {
				this.speed = 0;
			}
		} else if(nextKeyframe.m === 2) {//DISCRETE
			this.speed = 0;
		}


	}

	update(
		/// #if EDITOR
		ignoreRandom = false
		/// #endif
	) {
		/// #if DEBUG
		this.__processedTime = this.time;
		/// #endif
		let currentFrame = this.currentFrame;
		if(this.time === currentFrame.t) {
			/// #if EDITOR
			this.__lastFiredKeyframe = currentFrame;
			/// #endif
			let action;
			if(currentFrame.hasOwnProperty('a')) {
				action = currentFrame.a;
			}

			if(currentFrame.m === 1 || currentFrame.m === 2) { //LINEAR and DISCRETE Mode fields apply exact value at the end
				this.val = currentFrame.v;
			}

			this.time = currentFrame.j;
			if(currentFrame.hasOwnProperty('r')
				/// #if EDITOR
				&& !ignoreRandom
				/// #endif
			) {
				this.time += Math.round(Math.random() * currentFrame.r);
			}

			if(currentFrame.m === 0) { //- SMOOTH
				this.speed += (currentFrame.v - this.val) * this.pow;
				this.val += this.speed;
				this.speed *= this.damper;
			}

			if(currentFrame.hasOwnProperty('s')) {
				this.speed = currentFrame.s;
			}

			this.currentFrame = currentFrame.n;
			currentFrame = currentFrame.n;
			if(currentFrame.m === 1) {// LINEAR Mode
				let dist = currentFrame.t - this.time;
				if(dist > 0) {
					this.speed = (currentFrame.v - this.val) / dist;
				} else {
					this.speed = 0;
				}
			}

			if(action) {
				/// #if EDITOR
				if(!this.__doNotCallActions) {
					if(this.target.__logLevel > 1) {
						game.editor.ui.status.warn('action call: ' + action + '; timeline time: ' + this.time + '; game time:' + game.time + '; id:' + this.target.___id, 30019, this.target, undefined, true);
						if(this.target.__logLevel === 3) {
							/// break on callbacks
							console.log('callback: ' + action);
							debugger; // eslint-disable-line no-debugger
						}
					}
					/// #endif
					callByPath(action, this.target);
					/// #if EDITOR
				}
				/// #endif
			}
		} else {
			/// #if EDITOR
			this.__lastFiredKeyframe = undefined;
			/// #endif

			if(currentFrame.m === 0) { //- SMOOTH
				this.speed += (currentFrame.v - this.val) * this.pow;
				this.val += this.speed;
				this.speed *= this.damper;
			} else if(currentFrame.m === 1) { //LINEAR
				this.val += this.speed;
			} else if(currentFrame.m === 3) { //BOUNCE ⬇
				this.speed += currentFrame.g;
				this.val += this.speed;
				if(this.val >= currentFrame.v) {
					this.val = currentFrame.v;
					this.speed *= -currentFrame.b;
				}
			} else if(currentFrame.m === 4) { //BOUNCE ⬆
				this.speed -= currentFrame.g;
				this.val += this.speed;
				if(this.val <= currentFrame.v) {
					this.val = currentFrame.v;
					this.speed *= -currentFrame.b;
				}
			}
		}
		this.time++;
		(this.target as KeyedObject)[this.fieldName] = this.val;
	}
}

export type {
	TimelineFrameValuesCache,
	/// #endif
	TimelineFieldData, TimelineSerializedLabelsData, TimelineKeyFrame, TimelineSeriallizedData as TimelineSerializedData, TimelineSerializedKeyFrame, TimelineLabelData, TimelineData
};

