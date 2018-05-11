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
	return (_shift - val) * _scale;
}

class FieldsTimeline extends React.Component {
	
	constructor(props) {
		super(props);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
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
			var wholeTimelineData = editor.selection[0]._timelineData;
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
			c.min = Math.min.apply(null, c);
			c.max = Math.max.apply(null, c);
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
					for(let i = keyFrame.t; i <= n.t; i++) {
						ret.push((i * FRAMES_STEP) + ',' + scale(this.getValueAtTime(i)));
					}
					return ret.join(' ');
				case 1: //linear
					return (n.t * FRAMES_STEP) + ',' + scale(n.v);
				case 2: //discrete
					var v = scale(keyFrame.v);
					var t = n.t * FRAMES_STEP;
					return (keyFrame.t * FRAMES_STEP) + ',' + v + ' ' + t + ',' + v + ' ' + t + ',' + scale(n.v);
			}
		}
		return '';
	}
	
	renderKeyframe(keyFrame) {
		var loopArrow;
		if(keyFrame.j !== keyFrame.t) {
			var len = Math.abs(keyFrame.j - keyFrame.t);
			len *= FRAMES_STEP;
			loopArrow = R.svg({className:'loop-arrow', height:11, width:len},
				R.polyline({points:'0,0 6,6 3,8 0,0 6,9 '+(len/2)+',10 '+(len-3)+',7 '+len+',0'})
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
		width *= FRAMES_STEP;
				
		this.getValueAtTime(lastKeyframe.t); //cache timeline's values
		_scale = field.__cacheTimeline.max - field.__cacheTimeline.min;
		if(_scale === 0) {
			_scale = 1;
		}
		_scale = 25.0 / _scale;
		_shift = field.__cacheTimeline.max + 1/_scale;
		
		return R.div(fieldTimelineProps,
			R.div({style:{width}},
				label,
				field.t.map(this.renderKeyframe)
			),
			R.svg({className:'timeline-chart', height:'27', width},
				R.polyline({points:field.t.map(this.renderKeyframeChart).join(' ')})
			)
		);
	}
}

const calculateCacheSegmentForField = (fieldPlayer, c) => {
	var time;
	var i = 0;
	while(!c.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		fieldPlayer.update();
		c[time] = fieldPlayer.val;
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
}