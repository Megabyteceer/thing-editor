import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";
import FieldsTimeline from "./timeline-field.js";

export const FRAMES_STEP = 3;



var timelineContainerProps = {className: 'timeline list-view', onScroll:onTimelineScroll, onMouseDown:onTimelineMouseDown};
var objectsTimelineProps = {className: 'objects-timeline'};
var fieldLabelTimelineProps = {className: 'objects-timeline-labels'};
var leftTopPanel = {className: 'timeline-left-top-panel'};

var timeline;

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		timeline = this;
		this.timelineMarkerRef = this.timelineMarkerRef.bind(this);
		this.onBeforePropertyChanged = this.onBeforePropertyChanged.bind(this);
		this.onAfterPropertyChanged = this.onAfterPropertyChanged.bind(this);
	}
	
	componentDidMount() {
		editor.beforePropertyChanged.add(this.onBeforePropertyChanged);
		editor.afterPropertyChanged.add(this.onAfterPropertyChanged);
	}
	
	componentWillUnmount() {
		editor.beforePropertyChanged.remove(this.onBeforePropertyChanged);
		editor.afterPropertyChanged.remove(this.onAfterPropertyChanged);
	}
	
	onBeforePropertyChanged(fieldName) {
		editor.selection.some((o) => {
			if(o instanceof MovieClip) {
				getFrameAtTimeOrCreate(o, fieldName, 0);
			}
		});
	}
	
	onAfterPropertyChanged(fieldName) {
		editor.selection.some((o) => {
			if(o instanceof MovieClip) {
				var keyFrame = getFrameAtTimeOrCreate(o, fieldName, this.timelineMarker.state.time);
				keyFrame.v = o[fieldName];
				var field = getFieldByNameOrCreate(o, fieldName);
				renormalizeFieldTimelineDataAfterChange(field);
			}
		});
		timeline.forceUpdate();
	}
	
	setTime(time) {
		this.timelineMarker.setTime(time);
		editor.selection.some((o) => {
			if(o._timelineData) {
				o._timelineData.f.some((f) => {
					if(f.__cacheTimeline.hasOwnProperty(time)) {
						o[f.n] = f.__cacheTimeline[time];
					}
				});
			}
		});
		editor.refreshPropsEditor();
	}
	
	timelineMarkerRef(ref) {
		this.timelineMarker = ref;
	}
	
	render() {
		return R.fragment (
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.div(timelineContainerProps,
				R.div(leftTopPanel),
				React.createElement(TimeMarker, {timeline: this, ref:this.timelineMarkerRef}),
				editor.selection.map(renderObjectsTimeline)
			)
		)
	}
}

function getFieldByNameOrCreate(o, name) {
	if(!o._timelineData) {
		o._timelineData = {
			d:0.85,
			p:0.02,
			l:{},
			f:[]
		}
	}
	
	var fields = o._timelineData.f;
	for(field of fields) {
		if(field.n === name) {
			return field;
		}
	}
	var field = {
		n:name,
		t:[]
	}
	fields.push(field);
	return field;
}

function getFrameAtTimeOrCreate(o, name, time) {
	var field = getFieldByNameOrCreate(o, name);
	for(keyFrame of field.t) {
		if(keyFrame.t === time) {
			return keyFrame;
		}
	}
	var keyFrame = {
		v: o[name],	//target Value
		t: time,	//frame triggering Time
		m: getDefaultKeyframeTypeForField(o, name), //Mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE, 3 - JUMP FLOOR, 4 - JUMP ROOF
		j: time	    //Jump to time. If no jump need - equal to 't'
	};
	
	field.t.push(keyFrame);
	return keyFrame;
}

function getDefaultKeyframeTypeForField(o, name) {
	switch (name) {
		case 'x':
		case 'y':
			return 0; //- SMOOTH
		case 'alpha':
			return 1; //- LINEAR
		default:
			return getKeyframeTypesForField(o, name)[0];
	}
}

const keyframeTypesForNumber = [0,1,2,3,4];
const keyframeTypesDiscreteOnly = [2];

function getKeyframeTypesForField(o, name) {
	var fieldDesc = editor.getObjectField(o, name);
	if(fieldDesc.type === Number) {
		return keyframeTypesForNumber;
	}
	return keyframeTypesDiscreteOnly;
}

function renormalizeFieldTimelineDataAfterChange(fieldData) {
	var timeLineData = fieldData.t;
	timeLineData.sort(sortFieldsByTime);
	for(let field of timeLineData) {
		field.n = MovieClip._findNextField(timeLineData, field.t);
	}
	debugger;
	fieldData.__cacheTimeline = false;
	fieldData.__cacheTimelineRendered = null;
	for(var o in editor.selection) {
		if(o._timelineData && o._timelineData.f.some((f) => { //get movieclip by field's timeline data and invalidate whole serialisation cache
			return f === fieldData;
		})) {
			serializeCache.delete(o._timelineData);
		}
	}
}

Timeline.renormalizeFieldTimelineDataAfterChange = renormalizeFieldTimelineDataAfterChange;

const sortFieldsByTime = (a, b) => {
	return a.t - b.t;
}


const renderObjectsTimeline = (node) => {
	var key = __getNodeExtendData(node).id;
	if(node instanceof MovieClip && node._timelineData) {
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


const timeMarkerProps = {className: 'time-marker-body'};
const timeMarkerLineProps = {className: 'time-marker-v-line'};
const timeMarkerLabelProps = {className: 'time-marker-label'};
const smallTextProps = {className: 'small-text'};

class TimeMarker extends React.Component {
	
	constructor(params) {
		super(params);
		this.state = {time:0};
	}
	
	setTime(time) {
		this.setState({time});
	}
	
	render() {
		return R.div(timeMarkerProps,
			R.div(fieldLabelTimelineProps),
			R.div({className: 'time-marker', style:{left: this.state.time * FRAMES_STEP}},
				R.div(timeMarkerLineProps),
				R.div(timeMarkerLabelProps,
					R.b(null, this.state.time), R.span(smallTextProps, 'f ' + (this.state.time/60).toFixed(2) + 's')
				)
			)
		)
	}
}

function onTimelineScroll(ev) {
	$('.objects-timeline-labels').css({left: ev.target.scrollLeft + 'px'});
	$('.time-marker-body').css({top: ev.target.scrollTop + 'px'});
}

var isDragging = false;
function onTimelineMouseDown(ev) {
	var tl = $(ev.target).closest('.timeline')[0];
	var b = tl.getBoundingClientRect();
	if((ev.clientX - b.x) < tl.clientWidth && (ev.clientY - b.y) < tl.clientHeight) {
		
		isDragging = true;
		onTimeMarkerDrag(ev);
	}
}

function onTimeMarkerDrag(ev) {
	isDragging = (isDragging && (ev.buttons === 1));
	
		var tl = $('.timeline')[0];
		if(tl) {
			var b = tl.getBoundingClientRect();
			var x = ev.clientX - 110 - b.x;
			
			if(ev.buttons !== 0) {
				if (x < 20) {
					tl.scrollLeft -= 20;
				} else if ((x - b.width + 110) > -20) {
					tl.scrollLeft += 50;
				}
			}
			
			var dragTime = Math.max(0, Math.round((x + tl.scrollLeft) / FRAMES_STEP));
			
			if(isDragging) {
				timeline.setTime(dragTime);
			}
			FieldsTimeline.onMouseDrag(dragTime, ev.buttons);
		}
	}
}

$(window).on('mousemove', onTimeMarkerDrag);