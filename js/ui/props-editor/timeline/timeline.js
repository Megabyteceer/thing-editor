import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import ObjectsTimeline from "./objects-timeline.js";
import TimeMarker from "./time-marker.js";
import game from "thing-engine/js/game.js";
import TimelineKeyframe from "./timeline-keyframe.js";
import KeyframePropertyEditor from "./keyframe-property-editor.js";
import Line from "./timeline-line.js";
import TimeLabel from "./timeline-label.js";
import TimelineLoopPoint from "./timeline-loop-point.js";
import TimelineSelectFrame from "./timeline-select-frame.js";


let widthZoom;
let heightZoom;

let timeMarker;
function timeMarkerRef(ref) {
	timeMarker = ref;
}

let selectionFrame;

function selectionFrameRef(ref) {
	selectionFrame = ref;
}

let beforeChangeRemember;

let timeDragging;

let recordingIsDisabled;
let timelineInstance;
const justModifiedKeyframes = [];

const selectedComponents = [];
function clearSelection() {
	while (selectedComponents.length > 0) {
		unselect(selectedComponents[selectedComponents.length - 1]);
	}
}

function select(component) {
	assert(selectedComponents.indexOf(component) < 0, "Compinent already selected");
	component.setState({isSelected: true});
	selectedComponents.push(component);
	KeyframePropertyEditor.refresh();
}

function unselect(component) {
	let i = selectedComponents.indexOf(component);
	assert(i >= 0, "Compinent is not selected");
	component.setState({isSelected: false});
	selectedComponents.splice(i, 1);
	KeyframePropertyEditor.refresh();
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
		this.prevKeyFrame = this.prevKeyFrame.bind(this);
		this.nextKeyFrame = this.nextKeyFrame.bind(this);
		this.prevFrame = this.prevFrame.bind(this);
		this.nextFrame = this.nextFrame.bind(this);
		this.renderObjectsTimeline = this.renderObjectsTimeline.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.verticalZoomIn = this.verticalZoomIn.bind(this);
		this.verticalZoomOut = this.verticalZoomOut.bind(this);
		this._afterHistoryJump = this._afterHistoryJump.bind(this);
		this.horisontalZoomIn = this.horisontalZoomIn.bind(this);
		this.horisontalZoomOut = this.horisontalZoomOut.bind(this);
		this._afterHistoryJump = this._afterHistoryJump.bind(this);
	}

	static unselectKeyframe(keyframe) {
		for (let c of selectedComponents) {
			if (c.props.keyFrame === keyframe) {
				unselect(c);
				return;
			}
		}
	}

	selectKeyframe(kf) {
		clearSelection();
		select(kf.___view);
		this.setTime(kf.t, true);
	}

	componentDidMount() {
		clearSelection();
		Timeline.timelineDOMElement = document.querySelector('.timeline');
		timelineInstance = this;
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		editor.history.beforeHistoryJump.add(this._beforeHistoryJump);
		editor.history.afterHistoryJump.add(this._afterHistoryJump);
	}

	static deselectMovieclip(o) {
		for(let i = selectedComponents.length - 1; i >= 0; i--) {
			let c = selectedComponents[i];
			if(c instanceof TimelineKeyframe) {
				if(c.props.owner.props.owner.props.owner.props.node === o) {
					unselect(c);
				}
			}
		}
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
		window.removeEventListener('mouseup', this.onMouseUp);
	}

	verticalZoomIn() {
		this.verticalZoom(1.5);
	}

	verticalZoomOut() {
		this.verticalZoom(0.66666666);
	}

	verticalZoom(delta) {
	
		heightZoom = this.state.heightZoom;
		let tmp = heightZoom;

		heightZoom *= delta;
		if (heightZoom < 20) {
			heightZoom = 20;
		} else if (heightZoom > 135) {
			heightZoom = 135;
		}
		if (tmp !== heightZoom) {
			editor.settings.setItem('timeline-height-zoom', heightZoom);
			heightZoom = Math.floor(heightZoom);
			Line.invalideteChartsRenderCache();
			this.setState({heightZoom});
			this.centralizeSelection();
		}
	}

	horisontalZoomIn() {
		this.horisontalZoom(1.5);
	}

	horisontalZoomOut() {
		this.horisontalZoom(0.66666666);
	}

	horisontalZoom(delta) {
		widthZoom = this.state.widthZoom;
		let tmp = widthZoom;
		widthZoom *= delta;
		if (widthZoom < 0.5) {
			widthZoom = 0.5;
		} else if (widthZoom > 28.5) {
			widthZoom = 28.5;
		}
		if (tmp !== widthZoom) {
			editor.settings.setItem('timeline-width-zoom', widthZoom);
			if(widthZoom < 1.00001) {
				widthZoom = Math.round(widthZoom * 20) / 20.0;
			} else {
				widthZoom = Math.round(widthZoom);
			}
			Line.invalideteChartsRenderCache();
			this.setState({widthZoom});
			this.centralizeSelection();
		}
	}

	centralizeSelection() {
		setTimeout(() => {
			if (selectedComponents.length > 0) {
				timeMarker.scrollInToView(selectedComponents[0].getTime());
			}
		}, 0);
	}

	nextKeyFrame() {
		let time = this.getTime();
		let allKeyframes = this._getAllKeyframes();
		for(let k of allKeyframes) {
			if(k.t > time) {
				this.selectKeyframe(k);
				return;
			}
		}
		this.selectKeyframe(allKeyframes[0]);
	}

	_getAllKeyframes() {
		let allKeyframes = [];
		for(let m of editor.selection) {
			if(m instanceof MovieClip && m._timelineData) {
				for( let f of m._timelineData.f) {
					allKeyframes = allKeyframes.concat(f.t);
				}
			}
		}
		allKeyframes.sort(sortFieldsByTime);
		return allKeyframes;
	}

	prevKeyFrame() {
		let time = this.getTime();
		let allKeyframes = this._getAllKeyframes();
		if(allKeyframes.length > 0) {
			if(time === 0) {
				this.selectKeyframe(allKeyframes[allKeyframes.length - 1]);
			} else {
				let reClosestKeyframe = allKeyframes[0];
				for(let k of allKeyframes) {
					if(k.t >= time) {
						this.selectKeyframe(reClosestKeyframe);
						return;
					}
					reClosestKeyframe = k;
				}
			}
		}
	}

	prevFrame() {
		this.setTime(Math.max(0, this.getTime() - 1), true);
	}

	nextFrame() {
		this.setTime(this.getTime() + 1, true);
	}

	renderObjectsTimeline(node) {
		let key = node.___id;
		if(node instanceof MovieClip) {
			return React.createElement(ObjectsTimeline, {owner:this, node, key,
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
		if (game.__EDITORmode) {
			editor.selection.some((o) => {
				if (o._timelineData) {
					o._timelineData.f.some((f) => {
						f.___view.applyValueToMovielcip(time);
					});
				}
			});
			editor.refreshPropsEditor();
		}
	}

	startTimeDragging() {
		timeDragging = true;

	}

	render() {
		return R.fragment(
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			R.div(
				{
					onScroll: onTimelineScroll,
					onMouseDown: this.onMouseDown,
					className: 'timeline'
				},
				React.createElement(TimeMarker, {
					owner: this,
					ref: timeMarkerRef
				}),
				editor.selection.map(this.renderObjectsTimeline)
			),
			React.createElement(KeyframePropertyEditor, {
				className: game.__EDITORmode ? undefined : 'disabled',
				owner: this,
				keyframesGetter: getSelectedKeyframes
			}),
			React.createElement(TimelineSelectFrame, {
				className: game.__EDITORmode ? undefined : 'disabled',
				ref: selectionFrameRef
			}),
			R.span(
				{
					style: {
						display: 'none'
					}
				},
				R.btn('<', this.prevFrame, undefined, undefined, 188),
				R.btn('>', this.nextFrame, undefined, undefined, 190),
				R.btn('<<', this.prevKeyFrame, undefined, undefined, 1188),
				R.btn('>>', this.nextKeyFrame, undefined, undefined, 1190)
			)
		);

	}

	onMouseUp(ev) {
		timeDragging = false;
		if (draggingComponent) {
			if (reduceRepeatingKeyframesInSelected()) {
				this.forceUpdateDebounced();
			}
			if((ev.clientX > 0) && !ev.ctrlKey && (Math.abs(draggingStartX - ev.clientX) < 2)) {
				if(selectedComponents.length > 1) {
					clearSelection();
					select(draggingComponent);
				}

			}
			draggingXShift = 0;
			draggingComponent = null;
		} else {
			let selectedRect = selectionFrame.getRectAndFinishDragging();
			if (selectedRect) {
				selectElementsInRectangle(selectedRect, ev.shiftKey);
			}
		}
	}

	onMouseDown(ev) {
		isDragging = true;
		this.onMouseMove(ev);
		if (!draggingComponent && !ev.ctrlKey && !timeDragging) {
			selectionFrame.onMouseDown(ev);
		}
	}

	onMouseMove(ev) {

		if (Math.abs(draggingStartX - ev.clientX) > 20) {
			draggingStartX = -10000;
		}

		isDragging = isDragging && ev.buttons > 0;

		let time = Timeline.mouseEventToTime(ev);
		if (isDragging) {
			if (draggingComponent) {
				if(ev.buttons === 1) {
					let delta = time - prevDragTime;
					if (delta !== 0) {
						for (let c of selectedComponents) {
							let t = c.getTime();
							delta = Math.max(0, t + delta) - t;
							if (delta === 0) {
								return;
							}
						}
						for (let c of selectedComponents) {
							c.setTime(c.getTime() + delta);
						}

						prevDragTime += delta;
					}
					this.setTime(prevDragTime, true);
				}
			} else {
				if (ev.ctrlKey) {
					for (let c of selectedComponents) {
						if (c instanceof TimelineKeyframe || c instanceof TimelineLoopPoint) {
						let kf = c.props.keyFrame;
							if (kf.j !== time) {
								kf.j = time;
								c.onChanged();
								c.props.owner.forceUpdate();
								KeyframePropertyEditor.refresh();
							}
						}
					}
				}
			}
		}
		if(timeDragging) {
			this.setTime(time);
		}
		selectionFrame.onMouseMove(ev);
	}

	forceUpdateDebounced() {
		if(!this.forceUpdateDebouncedTimer) {
			this.forceUpdateDebouncedTimer = setTimeout(() => {
				this.forceUpdateDebouncedTimer = null;
				this.forceUpdate();
			}, 0);
		}
	}

	static unregisterDragableComponent(component) {
		let i = selectedComponents.indexOf(component);
		if (i >= 0) {
			selectedComponents.splice(i, 1);
		}
	}

	static registerDragableComponent(component) {
		assert(component.getTime && component.setTime, "Dragable component should have 'getTime', 'setTime(time)' function as dragging interface");
		component.onDragableMouseDown = onDragableMouseDown.bind(component);
	}

	static allFieldDataChanged(movieclip) {
		for (let f of movieclip._timelineData.f) {
			Timeline.fieldDataChanged(f, movieclip);
		}
	}

	static fieldDataChanged(fieldData, node) { //invalidate cache
		assert(node instanceof MovieClip, 'Movieclip expected');
		assert(node._timelineData.f.indexOf(fieldData) >= 0, 'field data is not beyond this movieclip.');
		let timeLineData = fieldData.t;

		timeLineData.sort(sortFieldsByTime);
		for (let field of timeLineData) {
			field.n = MovieClip._findNextKeyframe(timeLineData, field.j);
		}

		fieldData.___cacheTimeline = false;
		Line.invalideteChartsRenderCache(fieldData);
		MovieClip.invalidateSerializeCache(node);
		TimeLabel.renormalizeAllLabels(node);
		editor.sceneModified();
	}

	static _justModifiedSelectable(keyFrame) {
		justModifiedKeyframes.push(keyFrame);
	}

	_beforeHistoryJump() {
		justModifiedKeyframes.length = 0;
	}

	_afterHistoryJump() {
		setTimeout(() => {
			if (justModifiedKeyframes.length > 0) {
				clearSelection();
				for (let c of justModifiedKeyframes) {
					select(c);
				}
				if(timeMarker) {
					this.setTime(justModifiedKeyframes[0].getTime(), true);
				}
			}
		}, 0);
	}

	static onBeforePropertyChanged(fieldName) {
		if ((!Timeline.timelineDOMElement) || recordingIsDisabled) {
			beforeChangeRemember = new WeakMap();
		}

		editor.selection.some((o) => {
			if (o instanceof MovieClip) {
				if (Timeline.timelineDOMElement && !recordingIsDisabled) {
					if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
						getFrameAtTimeOrCreate(o, fieldName, 0);
					}
				} else {
					let val = o[fieldName];
					if (typeof val === 'number') {
						beforeChangeRemember.set(o, val);
					}
				}
			}
		});
	}

	static onAfterPropertyChanged(fieldName, field) {
		editor.selection.some((o) => {
			if (o instanceof MovieClip) {
				if (Timeline.timelineDOMElement && !recordingIsDisabled) {
					if (timelineInstance.isNeedAnimateProperty(o, fieldName)) {
						timelineInstance.createKeyframeWithCurrentObjectsValue(o, fieldName);
					}
				} else { //shift all keyframes instead of add keyframe
					let val = o[fieldName];
					if (typeof val === 'number') {
						let oldVal = beforeChangeRemember.get(o);
						if (oldVal !== val) {
							let delta = val - oldVal;
							let fld = getFieldByName(o, fieldName);
							if (fld) {
								for (let kf of fld.t) {
									let changedVal = kf.v + delta;
									if (field.hasOwnProperty('min')) {
										changedVal = Math.max(field.min, changedVal);
									}
									if (field.hasOwnProperty('max')) {
										changedVal = Math.min(field.max, changedVal);
									}
									kf.v = changedVal;
								}
								Timeline.fieldDataChanged(fld, o);
							}
						}
					}
					if (game.__EDITORmode) {
						o.resetTimeline();
					}
				}
			}
		});
		if (timelineInstance) {
			timelineInstance.forceUpdateDebounced();
		}
	}

	isNeedAnimateProperty(o, fieldName) {
		return (this.getTime() > 0 && fieldName !== 'isPlaying' && fieldName !== 'delay' && fieldName !== 'name') || getFieldByName(o, fieldName);
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

	static mouseEventToTime(ev) {
		let tl = Timeline.timelineDOMElement;
		let b = tl.getBoundingClientRect();
		let x = ev.clientX - 110 - b.x - draggingXShift;
		return Math.max(0, Math.round((x + tl.scrollLeft) / widthZoom));
	}

	static onAutoSelect(selectPath) {
		for(let o of editor.selection) {
			if(o._timelineData) {
				if(!selectPath[1]) { //label
					let labelView = document.querySelector('#window-timeline').querySelector('#timeline-label-' + selectPath[2].replace('.', '-').replace('#', '-'));
					window.shakeDomElement(labelView);
					return;
				} else  {
					for(let f of o._timelineData.f) {
						if(f.n === selectPath[1]) {
							let time = parseInt(selectPath[2]);
							for(let kf of f.t) {
								if(kf.t == time) {
									if(!kf.___view.state || ! kf.___view.state.isSelected) {
										select(kf.___view);
										timelineInstance.forceUpdateDebounced();
									}
									setTimeout(() => {
										let actionEditField = document.querySelector('#window-timeline').querySelector('.bottom-panel').querySelector('.props-editor-callback');
										window.shakeDomElement(actionEditField);
									}, 1);
									return;
								}
							}
						}
					}
				}
			}
		}
	}
}

function getFieldByName(o, name) {
	if (o._timelineData) {
		let fields = o._timelineData.f;
		for (let field of fields) {
			if (field.n === name) {
				return field;
			}
		}
	}
}

function getFieldByNameOrCreate(o, name) {
	let field = getFieldByName(o, name);
	if (!field) {
		if (!o._timelineData) {
			o._timelineData = {
				d: 0.85,
				p: 0.02,
				l: {},
				f: []
			};
		}
		field = {
			n: name,
			t: []
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


function createKeyframe(o, name, time, field) {

	let mode;
	let jumpTime = time;
	let prevField = MovieClip._findPreviousKeyframe(field.t, time);
	if (prevField) {
		mode = prevField.m;
		if (mode === 3 || mode === 4) {
			mode = 0;
		}
		if (prevField.j !== prevField.t) { //takes loop point from previous keyframe if it is exists;
			let labelBetweenKeyframes = null;
			for(let lName in o.timeline.l) {
				let lTime = o.timeline.l[lName];
				if(lTime >= prevField.t && lTime <= time) {
					labelBetweenKeyframes = true;
					break;
				}
			}
			if(!labelBetweenKeyframes) {
				jumpTime = prevField.j;
				prevField.j = prevField.t;
			}
		}
	} else {
		mode = getDefaultKeyframeTypeForField([o], name); //Mode 0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE, 3 - JUMP FLOOR, 4 - JUMP ROOF
	}

	let keyFrame = {
		v: o[name], //target Value
		t: time, //frame triggering Time
		m: mode,
		j: jumpTime, //Jump to time. If no jump need - equal to 't'
		___react_id: MovieClip.__generateKeyframeId()
	};

	field.t.push(keyFrame);
	Timeline.fieldDataChanged(field, o);
	return keyFrame;
}

function getDefaultKeyframeTypeForField(o, name) {
	switch (name) {
	case 'x':
	case 'y':
	case 'rotation':
		return 0; //- SMOOTH
	case 'alpha':
	case 'tintR':
	case 'tintG':
	case 'tintB':
		return 1; //- LINEAR
	default:
		return getKeyframeTypesForField(o, name)[0];
	}
}

const keyframeTypesForNumber = [0, 1, 2, 3, 4];
const keyframeTypesDiscreteOnly = [2];

function getKeyframeTypesForField(objects, name) {
	for(let o of objects) {
		let fieldDesc = editor.getObjectField(o, name);
		if (fieldDesc.type !== Number) {
			return keyframeTypesDiscreteOnly;
		}
	}
	return keyframeTypesForNumber;
}

Timeline.getKeyframeTypesForField = getKeyframeTypesForField;

let draggingComponent;
let draggingStartX;
let draggingXShift = 0;
let prevDragTime;

function onDragableMouseDown(ev) {
	draggingStartX = ev.clientX;
	if (!this.state || !this.state.isSelected) {
		if (!ev.ctrlKey && !ev.shiftKey) {
			clearSelection();
		}
		select(this);
	} else {
		if (!ev.shiftKey && ev.ctrlKey) {
			unselect(this);
		}
	}

	if (ev.altKey) {
		cloneSelectedKeyframes();
	}

	draggingComponent = this;
	draggingXShift = ev.clientX - ev.currentTarget.getBoundingClientRect().x;
	if(this instanceof TimelineLoopPoint) {
		prevDragTime = this.props.keyFrame.j;
	} else {
		prevDragTime = (this.props.label || this.props.keyFrame).t;
	}
}

function cloneSelectedKeyframes() {
	for (let c of selectedComponents) {
		if (c instanceof TimelineKeyframe) {
			c.clone();
		}
	}
}

const sortFieldsByTime = (a, b) => {
	if(a.t !== b.t) {
		return a.t - b.t;
	}
	a = (a.___view && a.___view.state && a.___view.state.isSelected) ? 0 : 1;
	b = (b.___view && b.___view.state && b.___view.state.isSelected) ? 0 : 1;
	return a - b;
};

function onTimelineScroll(ev) {
	document.querySelector('.objects-timeline-labels').style.left = ev.target.scrollLeft + 'px';
	document.querySelector('.time-marker-body').style.top = ev.target.scrollTop + 'px';
}

let isDragging = false;

function getSelectedKeyframes() {
	let ret = [];
	for (let c of selectedComponents) {
		if (c instanceof TimelineKeyframe) {
			ret.push(c);
		}
	}
	return ret;
}

function reduceRepeatingKeyframesInSelected() {
	let isModified = false;
	for (let keyframeComponent of getSelectedKeyframes()) {
		let timeLineData = keyframeComponent.props.owner.props.owner.props.field.t;
		for (let i = 0; i < timeLineData.length; i++) {
			let kf = timeLineData[i];
			for (let j = i + 1; j < timeLineData.length; j++) {
				let keyFrame = timeLineData[j];
				if ((kf !== keyFrame) && (kf.t === keyFrame.t)) {
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

function selectIfInRect(rect, component) {
	let view = component.___view;
	if(view.state && view.state.isSelected) {
		return;
	}
	let domElement = ReactDOM.findDOMNode(view);
	let r = domElement.getBoundingClientRect();
	if(r.right > rect.left && r.left < rect.right) {
		if(r.bottom > rect.top && r.top < rect.bottom) {
			select(view);
		}
	}
}

function selectElementsInRectangle(rect, shiftKey) {
	if(!shiftKey) {
		clearSelection();
	}

	for(let o of editor.selection) {
		if((o instanceof MovieClip) && (o._timelineData)) {
			for(let f of o._timelineData.f) {
				for(let kf of f.t) {
					selectIfInRect(rect, kf);
				}
			}
			for(let labelName in o._timelineData.l) {
				let label = o._timelineData.l[labelName];
				selectIfInRect(rect, label);
			}
		}
	}

	timelineInstance.onMouseUp({});
	timelineInstance.forceUpdateDebounced();
}