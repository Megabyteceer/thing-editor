import { ClassAttributes, Component, ComponentChild, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import Timeline from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline";
import FieldsTimelineView from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-field";
import TimelineKeyframeView from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-keyframe-view";
import TimelineLoopPoint from "thing-editor/src/editor/ui/props-editor/props-editors/timeline/timeline-loop-point";
import FieldPlayer, { TimelineFieldData, TimelineKeyFrame, TimelineKeyFrameType } from "thing-editor/src/engine/components/movie-clip/field-player";
import MovieClip from "thing-editor/src/engine/components/movie-clip/movie-clip.c";
import assert from "thing-editor/src/engine/debug/assert";

let _scale = 1;
let _shift = 0;

const scale = (val: number) => {
	return (_shift - val) * _scale;
};

let widthZoom = 1;
let heightZoom = 1;

let chartsCache: WeakMap<TimelineFieldData, ComponentChild> = new WeakMap();



interface TimelineLineViewProps extends ClassAttributes<TimelineLineView> {
	owner: FieldsTimelineView;

}

interface TimelineLineViewState {

}

export default class TimelineLineView extends Component<TimelineLineViewProps, TimelineLineViewState> {
	constructor(props: TimelineLineViewProps) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.renderKeyframe = this.renderKeyframe.bind(this);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
	}

	renderKeyframeChart(keyFrame: TimelineKeyFrame) {
		let field = this.props.owner.props.field;

		if(keyFrame.n && (keyFrame.t < keyFrame.n.t)) {
			let ret = [];
			if(keyFrame.n.m === TimelineKeyFrameType.DISCRETE) {
				let startTime = ((keyFrame.t) * widthZoom);
				let endTime = ((keyFrame.n.t) * widthZoom);
				let startValue = scale(MovieClip.__getValueAtTime(field, (keyFrame.t)) as number);
				if(!isNaN(startValue)) {
					let endValue = scale(MovieClip.__getValueAtTime(field, (keyFrame.n.t)) as number);
					if(!isNaN(endValue)) {
						ret.push(startTime + ',' + startValue);
						ret.push(endTime + ',' + startValue);
						ret.push(endTime + ',' + endValue);
					}
				}

			} else {
				let n = keyFrame.n;
				for(let i = keyFrame.t + ((keyFrame.t > 0) ? 1 : 0); i <= n.t; i++) {
					let v = scale(MovieClip.__getValueAtTime(field, i) as number);
					if(isNaN(v)) {
						break;
					}
					ret.push((i * widthZoom) + ',' + v);
				}
			}
			return ret.join(' ');
		}
		return '';
	}

	renderKeyframe(keyFrame: TimelineKeyFrame) {
		return h(TimelineKeyframeView, { key: keyFrame.___react_id, keyFrame, owner: this });
	}

	static invalidateChartsRenderCache(field?: TimelineFieldData) {
		if(field) {
			chartsCache.delete(field);
		} else {
			chartsCache = new WeakMap();
		}
	}

	onMouseDown(ev: PointerEvent) {
		if(ev.buttons === 2 && !ev.ctrlKey) {
			this.props.owner.toggleKeyframe(Timeline.mouseEventToTime(ev));
		}
	}

	render() {
		widthZoom = this.props.owner.props.owner.props.widthZoom;
		heightZoom = this.props.owner.props.owner.props.heightZoom;
		const ownerProps = this.props.owner.props;
		let field = ownerProps.field;

		let lastKeyframe = field.t[field.t.length - 1];
		assert(lastKeyframe, "Animated field with no keyframes detected.", 90001);
		let width = Math.max(lastKeyframe.t, lastKeyframe.j);

		width += 300;
		width *= widthZoom;
		let height = heightZoom;

		MovieClip.__getValueAtTime(field, lastKeyframe.t); //cache timeline's values
		_scale = field.___cacheTimeline!.max - field.___cacheTimeline!.min;
		if(_scale === 0) {
			_scale = 1;
		}
		_scale = (heightZoom - 10) / _scale;
		_shift = field.___cacheTimeline!.max + 1 / _scale;

		if(!chartsCache.has(field)) {
			if(isNaN(field.___cacheTimeline!.max)) {
				chartsCache.set(field, R.span());
			} else {
				chartsCache.set(field,
					R.svg({ className: 'timeline-chart', height, width },
						R.polyline({ points: field.t.map(this.renderKeyframeChart, field).join(' ') })
					)
				);
			}
		}

		let keyframes = [];
		let loopPoints = [];

		for(let k of field.t) {
			keyframes.push(this.renderKeyframe(k));
			if(k.t !== k.j || k.___keepLoopPoint) {
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



interface PlayingDisplayState {

}

class PlayingDisplay extends Component<TimelineLineViewProps, PlayingDisplayState> {

	interval!: number;
	fieldPlayer!: FieldPlayer;
	renderedTime: number = -1;

	componentDidMount() {
		this.interval = setInterval(this.update.bind(this), 35);
	}

	componentWillUnmount() {
		clearInterval(this.interval);
	}

	update() {
		let fieldPlayer = this.props.owner.props.owner.props.node.fieldPlayers[this.props.owner.props.fieldIndex];
		this.fieldPlayer = fieldPlayer;
		if(fieldPlayer && fieldPlayer.time !== this.renderedTime) {
			this.renderedTime = fieldPlayer.time;
			this.forceUpdate();
		}
	}

	render() {
		if(!this.fieldPlayer || typeof this.fieldPlayer.__processedTime === 'undefined') {
			return R.div();
		} else {
			let firedFrame;
			if(this.fieldPlayer.__lastFiredKeyframe) {
				firedFrame = R.div({ className: 'timeline-fire-indicator', style: { left: this.fieldPlayer.__lastFiredKeyframe.t * widthZoom } });
			}
			return R.fragment(
				R.div({ className: 'timeline-play-indicator', style: { left: (this.fieldPlayer.__processedTime) * widthZoom } }),
				firedFrame
			);
		}

	}
}