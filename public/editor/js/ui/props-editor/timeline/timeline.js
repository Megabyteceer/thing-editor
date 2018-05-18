import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";
import FieldsTimeline from "./timeline-field.js";
import SelectEditor from '../select-editor.js';

const FRAMES_STEP = 3;

var timelineContainerProps = {className: 'timeline list-view', onScroll:onTimelineScroll, onMouseDown:onTimelineMouseDown};
var objectsTimelineProps = {className: 'objects-timeline'};
var fieldLabelTimelineProps = {className: 'objects-timeline-labels'};
var leftTopPanel = {className: 'timeline-left-top-panel', onMouseDown:sp, onMouseMove:sp};

var timeline;
var timelineElement;
var lastTimelineBounds;

var affectedMovieclips = new Map();
function removeAffectFromUnselected(all) {
	affectedMovieclips.forEach((value, o) => {
		if(all || !__getNodeExtendData(o).isSelected) {
			o.resetTimeline();
			affectedMovieclips.delete(o);
		}
	});
}

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
		timeline = this;
		Timeline.timeline = this;
		this.timelineMarkerRef = this.timelineMarkerRef.bind(this);
		this.onBeforePropertyChanged = this.onBeforePropertyChanged.bind(this);
		this.onAfterPropertyChanged = this.onAfterPropertyChanged.bind(this);
		this.keyframePropretyEditorRef = this.keyframePropretyEditorRef.bind(this);
		this.onPlayStopToggle = this.onPlayStopToggle.bind(this);
	}
	
	componentDidMount() {
		timelineElement = $('.timeline')[0];
		editor.ui.viewport.beforePlayStopToggle.add(this.onPlayStopToggle)
		editor.beforePropertyChanged.add(this.onBeforePropertyChanged);
		editor.afterPropertyChanged.add(this.onAfterPropertyChanged);
	}
	
	componentWillUnmount() {
		timelineElement = null;
		editor.ui.viewport.beforePlayStopToggle.remove(this.onPlayStopToggle)
		editor.beforePropertyChanged.remove(this.onBeforePropertyChanged);
		editor.afterPropertyChanged.remove(this.onAfterPropertyChanged);
		removeAffectFromUnselected(true);
	}
	
	onPlayStopToggle() {
		removeAffectFromUnselected(true);
		this.setTime(0, true);
	}
	
	createKeyframeAtFieldData(fieldData, time) {
		this.createKeyframeWithCurrentObjectsValue(getMovieclipByFieldData(fieldData), fieldData.n, time);
		renormalizeFieldTimelineDataAfterChange(fieldData);
	}
	
	createKeyframeWithCurrentObjectsValue(o, fieldName, time) {
		var keyFrame = getFrameAtTimeOrCreate(o, fieldName, time || this.timelineMarker.state.time);
		keyFrame.v = o[fieldName];
		var field = getFieldByNameOrCreate(o, fieldName);
		renormalizeFieldTimelineDataAfterChange(field);
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
				this.createKeyframeWithCurrentObjectsValue(o, fieldName);
			}
		});
		timeline.forceUpdate();
	}
	
	deleteAnimationField(field) {
		var tl = getTimelineDataByFieldData(field);
		var i = tl.f.indexOf(field);
		assert(i >= 0, "Can't find field in timeline");
		tl.f.splice(i,1);
		renormalizeAllLabels(tl);
		MovieClip.invalidateSerializeCache(tl);
		editor.sceneModified();
		this.forceUpdate();
	}
	
	getTime() {
		return this.timelineMarker.state.time;
	}
	
	setTime(time, scrollInToView) {
		this.timelineMarker.setTime(time, scrollInToView);
		if(game.__EDITORmode) {
			editor.selection.some((o) => {
				if(o._timelineData) {
					affectedMovieclips.set(o, true);
					o._timelineData.f.some((f) => {
						if(f.__cacheTimeline.hasOwnProperty(time)) {
							o[f.n] = f.__cacheTimeline[time];
						}
					});
				}
			});
			editor.refreshPropsEditor();
		}
	}
	
	timelineMarkerRef(ref) {
		this.timelineMarker = ref;
	}
	
	keyframePropretyEditorRef(ref) {
		keyframePropretyEditor = ref;
	}
	
	static getTimelineElement() {
		return 	timelineElement;
	}
	
	static getTimelineWindowBounds() {
		if(timelineElement) {
			lastTimelineBounds = timelineElement.getBoundingClientRect();
		}
		return lastTimelineBounds;
	}
	
	render() {
		removeAffectFromUnselected();
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

Timeline.getKeyframeTypesForField = getKeyframeTypesForField;

function renormalizeFieldTimelineDataAfterChange(fieldData) { //invalidate cache
	var timeLineData = fieldData.t;
	timeLineData.sort(sortFieldsByTime);
	for(let field of timeLineData) {
		field.n = MovieClip._findNextKeyframe(timeLineData, field.j);
	}

	fieldData.__cacheTimeline = false;
	fieldData.__cacheTimelineRendered = null;
	MovieClip.invalidateSerializeCache(getTimelineDataByFieldData(fieldData));
	editor.sceneModified();
}

function getMovieclipByFieldData(fieldData) {
	for(var o of editor.selection) {
		if(o._timelineData && o._timelineData.f.some((f) => { //get movieclip by field's timeline data and invalidate whole serialisation cache
				return f === fieldData;
			})) {
			return o;
		}
	}
}

function getTimelineDataByFieldData(fieldData) {
	return getMovieclipByFieldData(fieldData)._timelineData;
}

Timeline.getTimelineDataByFieldData = getTimelineDataByFieldData;
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

function renormalizeLabel(label, timelineData) { //re find keyframes for modified label
	label.n = timelineData.f.map((fieldTimeline) => {
		return MovieClip._findNextKeyframe(fieldTimeline.t, label.t - 1);
	});
}

function renormalizeAllLabels(timelineData) {
	for(let key in timelineData.l) {
        if(!timelineData.l.hasOwnProperty(key)) continue;
		renormalizeLabel(timelineData.l[key], timelineData);
	}
}

function askForLabelName(existingLabelsNames, title, defaultName = '') {
	return editor.ui.modal.showPrompt(title, defaultName, undefined, (nameToCheck) => {
		if(existingLabelsNames.indexOf(nameToCheck) >= 0) {
			return 'Label with that name already esists.';
		}
	})
}

class ObjectsTimeline extends React.Component {
	
	renderTimeLabel(labelName, labelsNamesList) {
		return React.createElement(TimeLabel, {key:labelName, timelienData: this.props.node._timelineData, label:this.props.node._timelineData.l[labelName], labelName, labelsNamesList});
	}
	
	render() {
		var tl = this.props.node._timelineData;
		
		var labelsNames = Object.keys(tl.l);
		var labelsPanel = R.div({
				onMouseDown:(ev) => { //create new label by double click
					if(ev.buttons == 2) {
						askForLabelName(labelsNames, "Create new label:").then((name) => {
							if(name) {
								var label = {t: mouseTimelineTime};
								tl.l[name] = label;
								renormalizeLabel(label, tl);
								this.forceUpdate();
							}
						});
					}
				},
				title:'Right click to add time label',
				className:'timeline-labels-panel'
			},
			labelsNames.map((labelName)=> {return this.renderTimeLabel(labelName, labelsNames)})
		);
		
		return R.div(objectsTimelineProps,
			labelsPanel,
			tl.f.map((field, i) => {
				return React.createElement(FieldsTimeline, {field, fieldIndex:i, key:field.n, node:this.props.node});
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
	
	setTime(time, scrollInToView) {
		this.setState({time});
		if(scrollInToView) {
			timelineElement.scrollLeft = time * FRAMES_STEP -  Timeline.getTimelineWindowBounds().width / 2;
		}
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

class TimeLabel extends React.Component {
	
	render () {
		var tl = this.props.timelienData;
		var labelsNamesList = this.props.labelsNamesList;
		var label = this.props.label;
		var name = this.props.labelName;
		
		return R.div({className:'timeline-label', style:{left: label.t * FRAMES_STEP},
			onMouseDown: (ev) => {
				if(ev.buttons === 2) {
					editor.ui.modal.showQuestion('Label removing', 'Delete Label "' + name + '"?', () => {
						delete tl.l[name];
						timeline.forceUpdate();
					});
				} else {
					draggingXShift = ev.clientX - $(ev.target).closest('.timeline-label')[0].getBoundingClientRect().x;
					draggingLabel = label;
				}
				sp(ev);
			},
			onDoubleClick: (ev) => { //rename label by double click
				askForLabelName(labelsNamesList, "Rename label", name).then((enteredName) => {
					if(enteredName) {
						tl.l[enteredName] = label;
						delete tl.l[name];
						timeline.forceUpdate();
					}
				});
				sp(ev);
			}
			},
			name
		)
	}
}

function onTimelineScroll(ev) {
	$('.objects-timeline-labels').css({left: ev.target.scrollLeft + 'px'});
	$('.time-marker-body').css({top: ev.target.scrollTop + 'px'});
}

var isDragging = false;
var draggingXShift = 0;
var draggingLabel;
var mouseTimelineTime = 0;

function onTimelineMouseDown(ev) {
	var b = Timeline.getTimelineWindowBounds();
	var tl = Timeline.getTimelineElement();
	if((ev.clientX - b.x) < b.width && (ev.clientY - b.y) < b.height) {
		if($(ev.target).hasClass('timeline-keyframe')) {
			draggingXShift = ev.clientX - ev.target.getBoundingClientRect().x;
		} else {
			draggingXShift = 0;
			isDragging = true;
		}
		onMouseMove(ev);
	}
}

function onMouseMove(ev) {
	
	if($(ev.target).closest('.bottom-panel').length > 0) {
		return;
	}
	
	isDragging = (isDragging && (ev.buttons === 1));

	var b = Timeline.getTimelineWindowBounds();
	var tl = Timeline.getTimelineElement();
	if(tl) {
		var x = ev.clientX - 110 - b.x - draggingXShift;

		if(ev.buttons !== 0) {
			if (x < 20) {
				tl.scrollLeft -= 20;
			} else if ((x - b.width + 110) > -20) {
				tl.scrollLeft += 50;
			}
		} else {
			draggingLabel = null;
		}
		
		mouseTimelineTime = Math.max(0, Math.round((x + tl.scrollLeft) / FRAMES_STEP));
		timeline.mouseTimelineTime = mouseTimelineTime;
		
		if(isDragging) {
			timeline.setTime(mouseTimelineTime);
		}
		
		if(draggingLabel && (draggingLabel.t !== mouseTimelineTime)) {
			draggingLabel.t = mouseTimelineTime;
			editor.sceneModified();
			timeline.forceUpdate();
		}
		
		FieldsTimeline.onMouseDrag(mouseTimelineTime, ev.buttons);
	}
	
}

$(window).on('mousemove', onMouseMove);

