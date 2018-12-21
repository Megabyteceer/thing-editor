import Pool from "thing-engine/js/utils/pool.js";
import FieldPlayer from "thing-engine/js/components/movie-clip/field-player.js";
import TimelineKeyframe from "./timeline-keyframe.js";
import Timeline from "./timeline.js";
import TimelineLoopPoint from "./timeline-loop-point.js";

let _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
};

let widthZoom;
let heightZoom;

let chartsCache = new WeakMap();

export default class Line extends React.Component {

	constructor(props) {
		super(props);
		this.renderKeyframe = this.renderKeyframe.bind(this);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
	}

	renderKeyframeChart(keyFrame) {
		if(keyFrame.n && (keyFrame.t < keyFrame.n.t)) {
			let ret = [];
			if(keyFrame.n.m === 2) { //DISCRETE next frame is
				let startTime = ((keyFrame.t) * widthZoom);
				let endTime = ((keyFrame.n.t) * widthZoom);
				let startValue = scale(this.getValueAtTime(keyFrame.t));
				let endValue = scale(this.getValueAtTime(keyFrame.n.t));
				ret.push(startTime + ',' + startValue);
				ret.push(endTime + ',' + startValue);
				ret.push(endTime + ',' + endValue);
			} else {
				let n = keyFrame.n;
				for(let i = keyFrame.t+1; i <= n.t; i++) {
					ret.push((i * widthZoom) + ',' + scale(this.getValueAtTime(i)));
				}
			}
			return ret.join(' ');
		}
		return '';
	}

	getValueAtTime(time) {
		let field = this.props.owner.props.field;
		if(!field.__cacheTimeline) {
			let fieldPlayer = Pool.create(FieldPlayer);
			let c = [];
			field.__cacheTimeline = c;
			let wholeTimelineData = this.props.owner.props.owner.props.node._timelineData;
			fieldPlayer.init({}, field, wholeTimelineData.p, wholeTimelineData.d);
			fieldPlayer.reset();
			calculateCacheSegmentForField(fieldPlayer, c);
			for(let label in wholeTimelineData.l) {
				label = wholeTimelineData.l[label];
				if(!c.hasOwnProperty(label.t)) { //time at this label is not calculated yet
					fieldPlayer.goto(label.t, label.n[this.props.fieldIndex]);
					calculateCacheSegmentForField(fieldPlayer, c);
				}
			}
			let len = Math.max(c.length, field.t[field.t.length - 1].t + 1);
			let lastVal;
			for(let i = 0; i < len; i++) {
				if(i in c) {
					lastVal = c[i];
				} else {
					c[i] = lastVal;
				}
				
			}
			c.min = Math.min.apply(null, c);
			c.max = Math.max.apply(null, c);
			Pool.dispose(fieldPlayer);
		}
		return field.__cacheTimeline[time];
	}

	deleteKeyframe(keyFrame) {
		let f = this.props.owner.props.field;
		let i = f.t.indexOf(keyFrame);
		assert(i >= 0, "can't delete keyFrame.");
		if(i > 0) {
			Timeline.unselectKeyframe(keyFrame);
			f.t.splice(i, 1);
			this.props.owner.onChanged();
			this.forceUpdate();
		}

	}

	renderKeyframe(keyFrame) {
		return React.createElement(TimelineKeyframe, {key: keyFrame.___react_id, keyFrame, owner:this});
	}

	static invalideteChartsRenderCache(field = null) {
		if(field) {
			chartsCache.delete(field);
		} else {
			chartsCache = new WeakMap();
		}
	}

	render() {
		widthZoom = this.props.owner.props.owner.props.widthZoom;
		heightZoom = this.props.owner.props.owner.props.heightZoom;
		const ownerProps =this.props.owner.props;
		let field = ownerProps.field;

		let lastKeyframe = field.t[field.t.length - 1];
		let width = 0;
		if(lastKeyframe) {
			width = Math.max(lastKeyframe.t, lastKeyframe.j);
		}
		width += 300;
		width *= widthZoom;
		let height = heightZoom;
		
		this.getValueAtTime(lastKeyframe.t); //cache timeline's values
		_scale = field.__cacheTimeline.max - field.__cacheTimeline.min;
		if(_scale === 0) {
			_scale = 1;
		}
		_scale = (heightZoom - 10) / _scale;
		_shift = field.__cacheTimeline.max + 1 / _scale;
		
		if(!chartsCache.has(field)) {
			if(isNaN(field.__cacheTimeline.max)) {
				chartsCache.set(field, R.span());
			} else {
				chartsCache.set(field,
					R.svg({className:'timeline-chart', height, width},
						R.polyline({points:field.t.map(this.renderKeyframeChart, field).join(' ')})
					)
				);
			}
		}

		let keyframes = [];
		let loopPopints = [];

		for(let k of field.t) {
			keyframes.push(this.renderKeyframe(k));
			if(k.t !== k.j) {
				loopPopints.push(
					React.createElement(TimelineLoopPoint, {key: k.___react_id, owner:this, keyFrame:k, widthZoom})
				);
			}
		}
			

		return R.div(
			{
				style:{width, height}, onMouseDown:(ev) =>{
					if(ev.buttons === 2) {
						this.props.owner.onToggleKeyframeClick(Timeline.mouseEventToTime(ev));
					}
				}},
			keyframes,
			loopPopints,
			chartsCache.get(field),
			React.createElement(PlayingDisplay, this.props)
		);
	}
}

const calculateCacheSegmentForField = (fieldPlayer, c) => {
	fieldPlayer.__dontCallActions = true;
	let time;
	let i = 0;
	let fields = fieldPlayer.timeline;
	let limit = fields[fields.length-1].t;
	while(!c.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		c[time] = fieldPlayer.val;
		if(time > limit) {
			break;
		}
		fieldPlayer.update();
		
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
	fieldPlayer.__dontCallActions = false;
};



class PlayingDisplay extends React.Component {
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
	
	render () {
		if(!this.fieldPlayer) {
			return R.div();
		} else {
			let firedFrame;
			if(this.fieldPlayer.__lastFiredKeyframe) {
				firedFrame = R.div({className:'timeline-fire-indicator', style:{left: this.fieldPlayer.__lastFiredKeyframe.t * widthZoom}});
			}
			return R.fragment(
				R.div({className:'timeline-play-indicator', style:{left: this.fieldPlayer.time * widthZoom}}),
				firedFrame
			);
		}
		
	}
}