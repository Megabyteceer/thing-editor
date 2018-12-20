import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import ObjectsTimeline from "./objects-timeline.js";
import TimeMarker from "./time-marker.js";
import game from "thing-engine/js/game.js";
import TimelineKeyframe from "./timeline-keyframe.js";
import {KeyframePropertyEditor} from "./keyframe-property-editor.js";
import Line from "./timeline-line.js";


let widthZoom;
let heightZoom;

let timeMarker;
function timeMarkerRef(ref) {
	timeMarker = ref;
}

let beforeChangeRemember;

let recordingIsDisabled;
let timelineInstance;
const justModifiedKeyframes = [];

const selectedComponents = [];
function clearSelection() {
	while(selectedComponents.length > 0) {
		unselect(selectedComponents[selectedComponents.length - 1]);
	}
}

function select(component) {
	assert(selectedComponents.indexOf(component) < 0, "Compinent already selected");
	component.setState({isSelected: true});
	selectedComponents.push(component);
}

function unselect(component) {
	let i = selectedComponents.indexOf(component);
	assert(i >= 0, "Compinent is not selected");
	component.setState({isSelected: false});
	selectedComponents.splice(i, 1);
}

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);

		heightZoom = editor.settings.getItem('timeline-height-zoom', 40);
		widthZoom = editor.settings.getItem('timeline-width-zoom', 3);
		this.state = {
			heightZoom,
			widthZoom
		};
		this.prevFrame =this.prevFrame.bind(this);
		this.nextFrame =this.nextFrame.bind(this);
		this.renderObjectsTimeline = this.renderObjectsTimeline.bind(this);
		this.onWheel = this.onWheel.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this._afterHistoryJump = this._afterHistoryJump.bind(this);
	}

	componentDidMount() {
		clearSelection();
		Timeline.timelineDOMElement = $('.timeline')[0];
		timelineInstance = this;
		window.addEventListener('mousemove', this.onMouseMove);
		editor.history.beforeHistoryJump.add(this._beforeHistoryJump);
		editor.history.afterHistoryJump.add(this._afterHistoryJump);
	}

	static init() {
		editor.beforePropertyChanged.add(Timeline.onBeforePropertyChanged);
		editor.afterPropertyChanged.add(Timeline.onAfterPropertyChanged);
	}

	componentWillUnmount() {
		Timeline.timelineDOMElement = null;
		timelineInstance = null;
		editor.history.beforeHistoryJump.remove(this._beforeHistoryJump);
		editor.history.afterHistoryJump.remove(this._afterHistoryJump);
		window.removeEventListener('mousemove', this.onMouseMove);
	}

	onWheel(ev) {
		let delta = (ev.deltaY < 0) ? 1.5 : 0.66666666;
		if(ev.ctrlKey) {
			heightZoom = this.state.heightZoom;
			let tmp = heightZoom;
			
			heightZoom *= delta;
			if(heightZoom < 40) {
				heightZoom = 40;
			} else if(heightZoom > 135) {
				heightZoom = 135;
			}
			if(tmp !== heightZoom) {
				editor.settings.setItem('timeline-height-zoom', heightZoom);
				heightZoom=Math.floor(heightZoom);
				Line.invalideteChartsRenderCache();
				this.setState({heightZoom});
			}

		} else {
			widthZoom = this.state.widthZoom;
			let tmp = widthZoom;
			widthZoom *= delta;
			if(widthZoom < 2) {
				widthZoom = 2;
			} else if(widthZoom > 28.5) {
				widthZoom = 28.5;
			}
			if(tmp !== widthZoom) {
				editor.settings.setItem('timeline-width-zoom', widthZoom);
				widthZoom = Math.floor(widthZoom);
				Line.invalideteChartsRenderCache();
				this.setState({widthZoom});
			}
		}
		sp(ev);
	}

	prevFrame() {
		this.setTime(Math.max(0, this.getTime() - 1), true);
	}

	nextFrame() {
		this.setTime(this.getTime() + 1, true);
	}

	renderObjectsTimeline (node) {
		let key = node.___id;
		if(node instanceof MovieClip && node._timelineData) {
			return React.createElement(ObjectsTimeline, {node, key,
				heightZoom,
				widthZoom
			});
		} else {
			return R.div({key});
		}
	}

	getTime() {
		return timeMarker.state.time;
	}
	
	setTime(time, scrollInToView) {
		timeMarker.setTime(time, scrollInToView);
		if(game.__EDITORmode) {
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
	}



	render() {
		return R.fragment (
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.div({
				onScroll:onTimelineScroll,
				onMouseDown:this.onMouseDown,
				onMouseUp:this.onMouseUp,
				className: 'timeline list-view',
				onWheel: this.onWheel
			},
			React.createElement(TimeMarker, {owner: this, ref:timeMarkerRef}),
			editor.selection.map(this.renderObjectsTimeline),
			React.createElement(KeyframePropertyEditor, {owner: this, keyframes:getSelectedKeyframes()})
			),
			R.span({style:{display:'none'}},
				R.btn('<', this.prevFrame, undefined, undefined, 188),
				R.btn('>', this.nextFrame, undefined, undefined, 190)
			)
		);

	}

	onMouseUp() {
		if(draggingComponent) {
			//Timeline.renormalizeFieldTimelineDataAfterChange();
			if(reduceRepeatingKeyframesInSelected()) {
				this.forceUpdate();
			}
			
			draggingXShift = 0;
			draggingComponent = null;
		}
	}

	onMouseDown(ev) {
		isDragging = true;
		this.onMouseMove(ev);
	}

	onMouseMove(ev) {
		isDragging = (isDragging && (ev.buttons === 1));
		if(isDragging) {
			let time = mouseEventToTime(ev);
			if(draggingComponent) {
				let delta = time - prevDragTime;
				if(delta !== 0) {
					for(let c of selectedComponents) {
						let t = c.getTime();
						delta = Math.max(0, t + delta) - t;
						if(delta === 0) {
							return;
						}
					}
					for(let c of selectedComponents) {
						c.setTime(c.getTime() + delta);
					}
					
					prevDragTime += delta;
				}
				this.setTime(prevDragTime, true);
			} else {
				this.setTime(time, true);
			}
		}
	}

	static unregisterDragableComponent(component) {
		let i = selectedComponents.indexOf(component);
		if(i >= 0) {
			selectedComponents.splice(i, 1);
		}
	}

	static registerDragableComponent(component) {
		assert(component.getTime && component.setTime, "Dragable component should have 'getTime', 'setTime(time)' function as dragging interface");
		component.onMouseDown = onDragableMouseDown.bind(component);
	}

	static fieldDataChanged(fieldData, node) { //invalidate cache
		assert(node instanceof MovieClip, 'Movieclip expected');
		assert(node._timelineData.f.indexOf(fieldData) >= 0, 'field data is not beyond this movieclip.');
		let timeLineData = fieldData.t;

		timeLineData.sort(sortFieldsByTime);
		for(let field of timeLineData) {
			field.n = MovieClip._findNextKeyframe(timeLineData, field.j);
		}
	
		fieldData.__cacheTimeline = false;
		Line.invalideteChartsRenderCache(fieldData);
		MovieClip.invalidateSerializeCache(node);
		editor.sceneModified();
	}

	static _justModifiedKeyframe(keyFrame) {
		justModifiedKeyframes.push(keyFrame);
	}

	_beforeHistoryJump() {
		justModifiedKeyframes.length = 0;
	}
	
	_afterHistoryJump() {
		setTimeout(() => {
			if(justModifiedKeyframes.length > 0) {
				clearSelection();
				for(let c of justModifiedKeyframes) {
					select(c);
				}
				this.setTime(justModifiedKeyframes[0].props.keyFrame.t, true);
			}
		}, 0);
	}

	static onBeforePropertyChanged(fieldName) {
		if((!Timeline.timelineDOMElement) || recordingIsDisabled) {
			beforeChangeRemember = new WeakMap();
		}
		
		editor.selection.some((o) => {
			if(o instanceof MovieClip) {
				if(Timeline.timelineDOMElement && !recordingIsDisabled) {
					if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
						getFrameAtTimeOrCreate(o, fieldName, 0);
					}
				} else {
					let val = o[fieldName];
					if(typeof val === 'number') {
						beforeChangeRemember.set(o, val);
					}
				}
			}
		});
	}

	static onAfterPropertyChanged(fieldName, field) {
		editor.selection.some((o) => {
			if(o instanceof MovieClip) {
				if(Timeline.timelineDOMElement && !recordingIsDisabled) {
					if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
						timelineInstance.createKeyframeWithCurrentObjectsValue(o, fieldName);
					}
				} else { //shift all keyframes instead of add keyframe
					let val = o[fieldName];
					if(typeof val === 'number') {
						let oldVal = beforeChangeRemember.get(o);
						if(oldVal !== val) {
							let delta = val - oldVal;
							let fld = getFieldByName(o, fieldName);
							if(fld) {
								for(let kf of fld.t) {
									let changedVal = kf.v + delta;
									if(field.hasOwnProperty('min')) {
										changedVal = Math.max(field.min, changedVal);
									}
									if(field.hasOwnProperty('max')) {
										changedVal = Math.min(field.max, changedVal);
									}
									kf.v = changedVal;
								}
								Timeline.fieldDataChanged(fld, o);
							}
						}
					}
					if(game.__EDITORmode) {
						o.resetTimeline();
					}
				}
			}
		});
		if(timelineInstance) {
			timelineInstance.forceUpdate();
		}
	}

	isNeedAnimateProperty(o, fieldName) {
		return this.getTime() > 0 || getFieldByName(o, fieldName);
	}
	
	static disableRecording() {
		recordingIsDisabled = true;
	}
	
	static enableRecording() {
		recordingIsDisabled = false;
	}

	createKeyframeWithCurrentObjectsValue(o, fieldName, time) {
		let keyFrame = getFrameAtTimeOrCreate(o, fieldName, time || this.getTime());
		keyFrame.v = o[fieldName];
		let field = getFieldByNameOrCreate(o, fieldName);
		Timeline.fieldDataChanged(field, o);
	}

}


function getFieldByName(o, name) {
	if(o._timelineData) {
		let fields = o._timelineData.f;
		for(let field of fields) {
			if(field.n === name) {
				return field;
			}
		}
	}
}

function getFieldByNameOrCreate(o, name) {
	let field = getFieldByName(o, name);
	if(!field) {
		if(!o._timelineData) {
			o._timelineData = {
				d:0.85,
				p:0.02,
				l:{},
				f:[]
			};
		}
		field = {
			n:name,
			t:[]
		};
		o._timelineData.f.push(field);
	}
	return field;
}

function getFrameAtTimeOrCreate(o, name, time) {
	let field = getFieldByNameOrCreate(o, name);
	for (let keyFrame of field.t) {
		if (keyFrame.t === time) {
			return keyFrame;
		}
	}
	return createKeyframe(o, name, time, field);
}

	
function createKeyframe (o, name, time, field) {

	let mode;
	let jumpTime = time;
	let prevField = MovieClip._findPreviousKeyframe(field.t, time);
	if(prevField) {
		mode = prevField.m;
		if(mode === 3 || mode === 4) {
			mode = 0;
		}
		if(prevField.j !== prevField.t) { //takes loop point from previous keyframe if it is exists;
			jumpTime = prevField.j;
			prevField.j = prevField.t;
		}
	} else {
		mode = getDefaultKeyframeTypeForField(o, name); //Mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE, 3 - JUMP FLOOR, 4 - JUMP ROOF
	}
	
	
	
	
	let keyFrame = {
		v: o[name],	//target Value
		t: time,	//frame triggering Time
		m: mode,
		j: jumpTime	    //Jump to time. If no jump need - equal to 't'
	};
	
	field.t.push(keyFrame);
	renormalizeAllLabels(o._timelineData);
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
	let fieldDesc = editor.getObjectField(o, name);
	if(fieldDesc.type === Number) {
		return keyframeTypesForNumber;
	}
	return keyframeTypesDiscreteOnly;
}

Timeline.getKeyframeTypesForField = getKeyframeTypesForField;

function renormalizeLabel(label, timelineData) { //re find keyframes for modified label
	label.n = timelineData.f.map((fieldTimeline) => {
		return MovieClip._findNextKeyframe(fieldTimeline.t, label.t - 1);
	});
	MovieClip.invalidateSerializeCache(timelineData);
}

function renormalizeAllLabels(timelineData) {
	for(let key in timelineData.l) {
		if(!timelineData.l.hasOwnProperty(key)) continue;
		renormalizeLabel(timelineData.l[key], timelineData);
	}
}

let draggingComponent;
let draggingXShift = 0;
let prevDragTime;

function onDragableMouseDown(ev) {
	if(!this.state || !this.state.isSelected) {
		if(!ev.ctrlKey) {
			clearSelection();
		}
		select(this);
	} else {
		if(ev.ctrlKey) {
			unselect(this);
		}
	}
	draggingComponent = this;
	draggingXShift = ev.clientX - ev.target.getBoundingClientRect().x;
	prevDragTime = mouseEventToTime(ev);
}

function mouseEventToTime(ev) {
	let tl = Timeline.timelineDOMElement;
	let b = tl.getBoundingClientRect();
	let x = ev.clientX - 110 - b.x - draggingXShift;
	return Math.max(0, Math.round((x + tl.scrollLeft) / widthZoom));
}

const sortFieldsByTime = (a, b) => {
	return a.t - b.t;
};

function onTimelineScroll(ev) {
	$('.objects-timeline-labels').css({left: ev.target.scrollLeft + 'px'});
	$('.time-marker-body').css({top: ev.target.scrollTop + 'px'});
}

let isDragging = false;

function getSelectedKeyframes() {
	let ret = [];
	for(let c of selectedComponents) {
		if(c instanceof TimelineKeyframe) {
			ret.push(c);
		}
	}
	return ret;
}

function reduceRepeatingKeyframesInSelected() {
	let isModified = false;
	for(let keyframeComponent of getSelectedKeyframes()) {
		let timeLineData = keyframeComponent.props.owner.props.owner.props.field.t;
		for(let i = 0; i < timeLineData.length; i++) {
			let kf = timeLineData[i];
			for(let j = i+1; j < timeLineData.length; j++) {
				let keyFrame = timeLineData[j];
				if((kf !== keyFrame) && (kf.t === keyFrame.t)) {
					timeLineData.splice(j, 1);
					j--;
					isModified = true;
					Timeline.fieldDataChanged(
						keyframeComponent.props.owner.props.owner.props.field,
						keyframeComponent.props.owner.props.owner.props.owner.props.node
					);
				}
			}
		}
	}
	return isModified;
}