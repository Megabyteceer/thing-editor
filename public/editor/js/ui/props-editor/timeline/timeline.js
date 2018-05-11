import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";
import FieldPlayer from "/engine/js/components/movie-clip/field-player.js";
import Pool from "/engine/js/utils/pool.js";

const FRAMES_STEP = 3;

var timelineContainerProps = {className: 'timeline list-view'};
var objectsTimelineProps = {className: 'objects-timeline'};
var fieldLabelTimelineProps = {className: 'objects-timeline-labels'};
var fieldTimelineProps = {className: 'field-timeline'};

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		this.onPowChanged = this.onPowChanged.bind(this);
	}
	
	onPowChanged(ev) {
		
	}
	
	render() {
		return R.fragment (
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.input({onChange:this.onPowChanged}),
			R.div(timelineContainerProps,
				editor.selection.map(renderObjectsTimeline)
			)
		)
	}
}

const renderObjectsTimeline = (node) => {
	var key = __getNodeExtendData(node).id;
	if(node instanceof MovieClip) {
		return React.createElement(ObjectsTimeline, {node, key});
	} else {
		return R.div({key});
	}
}

class ObjectsTimeline extends React.Component {
	render() {
		var tl = this.props.node._timelineData;
		return R.div(objectsTimelineProps,
			tl.f.map((field, i) => {
				return React.createElement(FieldsTimeline, {field, fieldIndex:i, key:field.n});
			})
		)
	}
}


const keyframesClasses = [
	'timeline-keyframe timeline-keyframe-smooth',
	'timeline-keyframe timeline-keyframe-linear',
	'timeline-keyframe timeline-keyframe-discrete'
]

var _scale, _shift;
const scale = (val) => {
	return (val + _shift) / _scale;
}

class FieldsTimeline extends React.Component {
	
	constructor(props) {
		super(props);
	}
	
	invalidateTimelineCache () {
		this.props.field.__cacheTimeline = false;
	}
	
	getValueAtTime(time) {
		var field = this.props.field;
		if(!field.__cacheTimeline) {
			var fieldPlayer = Pool.create(FieldPlayer);
			var c = [];
			field.__cacheTimeline = c;
			fieldPlayer.timeline = field;
			fieldPlayer.reset();
			calculateCacheSegmentForField(fieldPlayer);
			for(let label of field.l) {
				if(!c.hasOwnProperty(label.t)) { //time at this label is not calculated yet
					fieldPlayer.goto(label.t, label.n[this.props.fieldIndex]);
					calculateCacheSegmentForField(fieldPlayer);
				}
			}
			c.min = Math.min.call(null, c);
			c.max = Math.max.call(null, c);
			Pool.dispose(fieldPlayer);
		}
		if(field.__cacheTimeline.hasOwnProperty(time)) {
			return field.__cacheTimeline[time];
		} else {
			return false;
		}
	}
	
	renderKeyframeChart(keyFrame) {
		if(keyFrame.n && (keyFrame.t < keyFrame.n.t)) {
			var n = keyFrame.n;
			switch (n.m) {
				case 0:
					var ret = [];
					for(let i = keyFrame.t; i < n.t; i++) {
						ret.push(i + ',' + scale(this.getValueAtTime(i)));
					}
					return ret.join(' ');
					break;
				case 1: //linear
					return (n.t * FRAMES_STEP) + ',' + scale(t.v);
				case 2: //discrete
					var v = scale(keyFrame.v);
					var t = n.t * FRAMES_STEP;
					return (keyFrame.t * FRAMES_STEP) + ',' + v + ' ' + t + ',' + v + ' ' + t + ',' + scale(t.v);
			}
		}
		return '';
	}
	
	renderKeyframe(keyFrame) {
		var loopArrow;
		if(keyFrame.j !== keyFrame.t) {
			var len = Math.abs(keyFrame.j - keyFrame.t) + 3;
			len *= FRAMES_STEP;
			loopArrow = R.svg({className:'loop-arrow', height:5, width:len},
				R.polyline({points:'3,0 6,3 0,3 3,0 6,5 '+(len-3)+',5 '+len+',0'})
			);
		}
		return R.div({key:keyFrame.t, className:keyframesClasses[keyFrame.m], style:{left:keyFrame.t * FRAMES_STEP}}, loopArrow);
	}
	
	render() {
		var field = this.props.field;
		
		var label = R.div(fieldLabelTimelineProps, field.n);
		
		var lastKeyframe = field.t[field.t.length - 1];
		var width = 0;
		if(lastKeyframe) {
			width = Math.max(lastKeyframe.t, lastKeyframe.j);
		}
		width += 300;
		
		this.getValueAtTime(lastKeyframe.t); //cache timeline's values
		shift = field.__cacheTimeline.max;
		scale = Math.max(1, field.__cacheTimeline.max - field.__cacheTimeline.min / 40.0);
			
		return R.div(fieldTimelineProps,
			loopArrow = R.svg({className:'timeline-chart', height:5, width:len},
				R.polyline({points:field.t.map(this.renderKeyframeChart).join(' ')})
			),
			R.div({style:{width}},
				label,
				field.t.map(this.renderKeyframe)
			)
		);
	}
}

const calculateCacheSegmentForField = (fieldPlayer) => {
	var c = fieldPlayer.timelineData.__cacheTimeline;
	var time;
	var i = 0;
	while(!c.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		fieldPlayer.update();
		c[fieldPlayer.time] = fieldPlayer.val;
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
}