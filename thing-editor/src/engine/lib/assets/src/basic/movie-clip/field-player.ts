/// #if EDITOR
import type FieldsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field';
import type TimelineKeyframeView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-keyframe-view';
import game from 'thing-editor/src/engine/game.js';

/// #endif

import type TimelineLabelView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-label-view';
import type TimelineLoopPoint from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-loop-point';

import type MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';

interface TimelineKeyFrame {

	m: TimelineKeyFrameType;

	/** next keyframe */
	n: TimelineKeyFrame;

	/** target value */
	v: number | string | boolean;

	/** set speed */
	s?: number;

	/** time */
	t: number;

	/** time to jump (loop time) */
	j: number;

	/** random delay (max random value to decrease distance to next keyframe */
	r?: number;

	/** action (callback) */
	a?: string;

	/** power of gravity for BOUNCE keyframes */
	g?: number;

	/** bouncing power for BOUNCE keyframes */
	b?: number;

	/// #if EDITOR

	___view: TimelineKeyframeView | null;

	___react_id?: number;

	___keepLoopPoint?: boolean;

	___loopPointView?: TimelineLoopPoint;

	/// #endif
}

type Partial<T> = {
	[P in keyof T]?: T[P];
};

type TimelineSerializedKeyFrame = Partial<TimelineKeyFrame>;

type NumericArray = number[];
interface TimelineFrameValuesCache extends NumericArray {
	min: number;
	max: number;
}

interface TimelineFieldData {
	/** name of property to animate */
	n: string;

	t: TimelineKeyFrame[];

	/// #if EDITOR
	___timelineData: TimelineData;
	___fieldIndex: number;
	___cacheTimeline?: TimelineFrameValuesCache;
	___discretePositionsCache?: true[];
	___view?: FieldsTimelineView | null;
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

	/// #if EDITOR
	___view?: TimelineLabelView | null;
	/// #endif
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

	target!: MovieClip;
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

	init(target: MovieClip, data: TimelineFieldData, pow: number, damper: number) {

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
		if (this.currentFrame.hasOwnProperty('r')
			/// #if EDITOR
			&& !ignoreRandom
			/// #endif
		) {
			this.time += Math.round(Math.random() * (this.currentFrame.r as number));
		}
		this.val = this.currentFrame.v;
		this.targetVal = this.val;
		this.speed = 0;

		/// #if EDITOR
		if (game.__EDITOR_mode && this.target.__previewFrame) {
			let kf = this.timeline.find((kf) => {
				return kf.t >= this.target.__previewFrame;
			}) || this.timeline[this.timeline.length - 1];
			if (kf) {
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
		if (nextKeyframe.m === TimelineKeyFrameType.LINEAR) {
			let dist = nextKeyframe.t - this.time;
			if (dist > 0) {
				this.speed = (nextKeyframe.v as number - this.val) / dist;
			} else {
				this.speed = 0;
			}
		} else if (nextKeyframe.m === TimelineKeyFrameType.DISCRETE) {
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
		if (this.time === currentFrame.t) {
			/// #if EDITOR
			this.__lastFiredKeyframe = currentFrame;
			/// #endif
			let action;
			if (currentFrame.hasOwnProperty('a')) {
				action = currentFrame.a;
			}

			if (currentFrame.m === TimelineKeyFrameType.LINEAR || currentFrame.m === TimelineKeyFrameType.DISCRETE) {
				this.val = currentFrame.v;
			}

			this.time = currentFrame.j;
			if (currentFrame.hasOwnProperty('r')
				/// #if EDITOR
				&& !ignoreRandom
				/// #endif
			) {
				this.time += Math.round(Math.random() * (currentFrame.r as number));
			}

			if (currentFrame.m === TimelineKeyFrameType.SMOOTH) {
				this.speed += (currentFrame.v as number - this.val) * this.pow;
				this.val += this.speed;
				this.speed *= this.damper;
			}

			if (currentFrame.hasOwnProperty('s')) {
				this.speed = currentFrame.s as number;
			}

			this.currentFrame = currentFrame.n;
			currentFrame = currentFrame.n;
			if (currentFrame.m === TimelineKeyFrameType.LINEAR) {
				let dist = currentFrame.t - this.time;
				if (dist > 0) {
					this.speed = (currentFrame.v as number - this.val) / dist;
				} else {
					this.speed = 0;
				}
			}

			if (action) {
				/// #if EDITOR
				if (!this.__doNotCallActions) {
					if (this.target.__logLevel > 1) {
						game.editor.ui.status.warn('action call: ' + action + '; timeline time: ' + this.time + '; game time:' + game.time + '; id:' + this.target.___id, 30019, this.target, undefined, true);
						if (this.target.__logLevel === 3) {
							/// break on callbacks
							console.log('callback: ' + action);
							debugger;
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

			if (currentFrame.m === TimelineKeyFrameType.SMOOTH) {
				this.speed += (currentFrame.v as number - this.val) * this.pow;
				this.val += this.speed;
				this.speed *= this.damper;
			} else if (currentFrame.m === TimelineKeyFrameType.LINEAR) {
				this.val += this.speed;
			} else if (currentFrame.m === TimelineKeyFrameType.BOUNCE_BOTTOM) {
				this.speed += currentFrame.g as number;
				this.val += this.speed;
				if (this.val >= currentFrame.v) {
					this.val = currentFrame.v;
					this.speed *= currentFrame.b as number;
				}
			} else if (currentFrame.m === TimelineKeyFrameType.BOUNCE_TOP) {
				this.speed -= currentFrame.g as number;
				this.val += this.speed;
				if (this.val <= currentFrame.v) {
					this.val = currentFrame.v;
					this.speed *= currentFrame.b as number;
				}
			}
		}
		this.time++;
		(this.target as KeyedObject)[this.fieldName] = this.val;
	}
}

export { TimelineKeyFrameType };
export type {
	TimelineData,
	TimelineFieldData, TimelineFrameValuesCache, TimelineKeyFrame, TimelineLabelData, TimelineSeriallizedData as TimelineSerializedData, TimelineSerializedKeyFrame, TimelineSerializedLabelsData
};


enum TimelineKeyFrameType {
	SMOOTH = 0,
	LINEAR = 1,
	DISCRETE = 2,
	BOUNCE_BOTTOM = 3,
	BOUNCE_TOP = 4,
}
