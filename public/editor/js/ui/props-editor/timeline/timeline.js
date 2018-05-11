import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";

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
		var tl = this.props.node.timeline;
		return R.div(objectsTimelineProps,
			tl.f.map((field) => {
				return React.createElement(FieldsTimeline, {field, key:field.n});
			})
		)
	}
}


const keyframesClasses = [
	'timeline-keyframe timeline-keyframe-smooth',
	'timeline-keyframe timeline-keyframe-linear',
	'timeline-keyframe timeline-keyframe-discrete'
]

class FieldsTimeline extends React.Component {
	
	constructor(props) {
		super(props);
	}
	
	renderKeyframe(keyFrame) {
		var loopArrow;
		if(keyFrame.j !== keyFrame.t) {
			var len = Math.abs(keyFrame.j - keyFrame.t) + 3;
			len *= FRAMES_STEP;
			loopArrow = R.svg({className:'loop-arrow', height:5, width:len},
				R.polyline({points:'3,0 3,3 0,3 3,0 3,5 '+len+',5 '+len+',0'})
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
		
		return R.div(fieldTimelineProps,
			R.div({style:{width}},
				label,
				field.t.map(this.renderKeyframe)
			)
		);
	}
}


