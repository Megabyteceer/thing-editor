import type { ClassAttributes, ComponentChild } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import Timeline from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline';
import type FieldsTimelineView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field';
import TimelineKeyframeView from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-keyframe-view';
import TimelineLoopPoint from 'thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-loop-point';
import assert from 'thing-editor/src/engine/debug/assert';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type FieldPlayer from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';
import type { TimelineFieldData, TimelineKeyFrame } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';

let _scale = 1;
let _shift = 0;

const scale = (val: number) => {
	//assert(!isNaN(val), 'nan');
	return (_shift - val) * _scale;
};

let widthZoom = 1;
let heightZoom = 1;

let chartsCache: WeakMap<TimelineFieldData, ComponentChild> = new WeakMap();


interface TimelineLineViewProps extends ClassAttributes<TimelineLineView> {
	owner: FieldsTimelineView;

}


export default class TimelineLineView extends Component<TimelineLineViewProps> {
	constructor(props: TimelineLineViewProps) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.renderKeyframe = this.renderKeyframe.bind(this);
	}

	renderKeyframe(keyFrame: TimelineKeyFrame) {
		return h(TimelineKeyframeView, { key: keyFrame.___react_id, keyFrame, owner: this });
	}

	static invalidateChartsRenderCache(field?: TimelineFieldData) {
		if (field) {
			chartsCache.delete(field);
		} else {
			chartsCache = new WeakMap();
		}
	}

	onMouseDown(ev: PointerEvent) {
		if (ev.buttons === 2 && !ev.ctrlKey) {
			this.props.owner.toggleKeyframe(Timeline.mouseEventToTime(ev));
		}
	}

	render() {
		widthZoom = this.props.owner.props.owner.props.widthZoom;
		heightZoom = this.props.owner.props.owner.props.heightZoom;
		const ownerProps = this.props.owner.props;
		let field = ownerProps.field;

		let lastKeyframe = field.t[field.t.length - 1];
		assert(lastKeyframe, 'Animated field with no keyframes detected.', 90001);
		let width = Math.max(lastKeyframe.t, lastKeyframe.j);

		width += 300;
		width *= widthZoom;
		let height = heightZoom;

		MovieClip.__getValueAtTime(field, lastKeyframe.t); //cache timeline's values
		_scale = field.___cacheTimeline!.max - field.___cacheTimeline!.min;
		if (_scale === 0) {
			_scale = 1;
		}
		_scale = (heightZoom - 10) / _scale;
		_shift = field.___cacheTimeline!.max + 1 / _scale;

		if (!chartsCache.has(field)) {
			if (isNaN(field.___cacheTimeline!.max)) {
				chartsCache.set(field, R.span());
			} else {
				let currentPoints: number[] = [];
				const lines = [currentPoints];
				const values = field.___cacheTimeline!;
				for (let i = 0; i < values!.length; i++) {
					if (isNaN(values[i])) {
						if (currentPoints.length) {
							currentPoints = [];
							lines.push(currentPoints);
						}
					} else {
						if (field.___discretePositionsCache![i] && i > 0) {
							if ((i - 1) in values) {
								currentPoints.push(i * widthZoom, scale(values[i - 1]));
							}
						}
						currentPoints.push(i * widthZoom, scale(values[i]));
					}
				}
				chartsCache.set(field,
					R.svg({ className: 'timeline-chart', height, width },
						lines.map(points => R.polyline({ points: points.join(' ') }))
					)
				);
			}
		}

		let keyframes = [];
		let loopPoints = [];

		for (let k of field.t) {
			keyframes.push(this.renderKeyframe(k));
			if (k.t !== k.j || k.___keepLoopPoint) {
				loopPoints.push(
					h(TimelineLoopPoint, { key: k.___react_id, owner: this, keyFrame: k, widthZoom })
				);
			}
		}


		return R.div(
			{
				style: { width, height }, onMouseDown: this.onMouseDown
			},
			keyframes,
			loopPoints,
			chartsCache.get(field),
			h(PlayingDisplay, this.props)
		);
	}
}

class PlayingDisplay extends Component<TimelineLineViewProps> {

	interval!: number;
	fieldPlayer!: FieldPlayer;
	renderedTime = -1;

	componentDidMount() {
		this.interval = window.setInterval(this.update.bind(this), 35);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	update() {
		let fieldPlayer = this.props.owner.props.owner.props.node.fieldPlayers[this.props.owner.props.fieldIndex];
		this.fieldPlayer = fieldPlayer;
		if (fieldPlayer && fieldPlayer.time !== this.renderedTime) {
			this.renderedTime = fieldPlayer.time;
			this.forceUpdate();
		}
	}

	render() {
		if (!this.fieldPlayer || typeof this.fieldPlayer.__processedTime === 'undefined') {
			return R.div();
		} else {
			let firedFrame;
			if (this.fieldPlayer.__lastFiredKeyframe) {
				firedFrame = R.div({ className: 'timeline-fire-indicator', style: { left: this.fieldPlayer.__lastFiredKeyframe.t * widthZoom } });
			}
			return R.fragment(
				R.div({ className: 'timeline-play-indicator', style: { left: (this.fieldPlayer.__processedTime) * widthZoom } }),
				firedFrame
			);
		}

	}
}
