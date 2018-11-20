import Timeline from "./timeline.js";
import Pool from "thing-engine/js/utils/pool.js";
import FieldPlayer from "thing-engine/js/components/movie-clip/field-player.js";
import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import SelectEditor from "../select-editor.js";
import CallbackEditor from "../callback-editor.js";
import NumberEditor from "../number-editor.js";

const FRAMES_STEP = 3;
const DEFAULT_GRAVITY = 1; //JUMP ROOF, JUMP FLOOR default gravity and boouncing
const DEFAULT_BOUNCING = 0.4;

const keyframesClasses = [
	'timeline-keyframe-smooth',
	'timeline-keyframe-linear',
	'timeline-keyframe-discrete',
	'timeline-keyframe-jump-floor',
	'timeline-keyframe-jump-roof'
];

let fieldLabelTimelineProps = {className: 'objects-timeline-labels', onMouseDown:sp, onMouseMove:sp};

let _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
};

const allFieldsTimelines = [];

export default class FieldsTimeline extends React.Component {
	
	constructor(props) {
		super(props);
		this.deleteKeyframe = this.deleteKeyframe.bind(this);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
		this.renderKeyframe = this.renderKeyframe.bind(this);
		this.onKeyframeChanged = this.onKeyframeChanged.bind(this);
		this.onInsertFramesClicked = this.onInsertFramesClicked.bind(this);
		this.onRemoveFieldClick = this.onRemoveFieldClick.bind(this);
		this.onGoLeftClick = this.onGoLeftClick.bind(this);
		this.onGoRightClick = this.onGoRightClick.bind(this);
		this.onToggleKeyframeClick = this.onToggleKeyframeClick.bind(this);
	}
	
	static onAutoSelect(selectPath) {
		for(let f of allFieldsTimelines) {
			if(f.props.field.n === selectPath[1]) {
				f.onAutoSelect(selectPath);
				break;
			}
		}
	}

	onAutoSelect(selectPath) {
		let time = parseInt(selectPath[2]);
		for(let kf of this.props.field.t) {
			if(kf.t == time) {
				this.selectKeyframe(kf);
				let actionEditField = $('#window-timeline').find('.bottom-panel').find('.props-editor-callback');
				window.shakeDomElement(actionEditField);
				actionEditField.focus();
			}
		}
	}

	componentDidMount() {
		allFieldsTimelines.push(this);
	}

	componentWillUnmount() {
		let i = allFieldsTimelines.indexOf(this);
		assert(i >= 0, 'keyframes list is corrupted');
		allFieldsTimelines.splice(i, 1);

		if(selectedTimeline === this) {
			selectedTimeline = null;
			selectedKeyframe = null;
			keyframePropsEditor.forceUpdate();
		}
	}
	
	getValueAtTime(time) {
		let field = this.props.field;
		if(!field.__cacheTimeline) {
			let fieldPlayer = Pool.create(FieldPlayer);
			let c = [];
			field.__cacheTimeline = c;
			let wholeTimelineData = Timeline.getTimelineDataByFieldData(field);
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
	
	renderKeyframeChart(keyFrame) {
		if(keyFrame.n && (keyFrame.t < keyFrame.n.t)) {
			let ret = [];
			if(keyFrame.n.m === 2) { //DISCRETE next frame is
				let startTime = ((keyFrame.t) * FRAMES_STEP);
				let endTime = ((keyFrame.n.t) * FRAMES_STEP);
				let startValue = scale(this.getValueAtTime(keyFrame.t));
				let endValue = scale(this.getValueAtTime(keyFrame.n.t));
				ret.push(startTime + ',' + startValue);
				ret.push(endTime + ',' + startValue);
				ret.push(endTime + ',' + endValue);
			} else {
				let n = keyFrame.n;
				for(let i = keyFrame.t+1; i <= n.t; i++) {
					ret.push((i * FRAMES_STEP) + ',' + scale(this.getValueAtTime(i)));
				}
			}
			return ret.join(' ');
		}
		return '';
	}
	
	toggleKeyframeType(keyFrame) {
		let types = Timeline.getKeyframeTypesForField(editor.selection[0], this.props.field.n);
		let i = types.indexOf(keyFrame.m);
		this.setKeyframeType(types[(i + 1) % types.length]);
	}

	setKeyframeType(keyFrame, type) {
		/// #if EDITOR
		let types = Timeline.getKeyframeTypesForField(editor.selection[0], this.props.field.n);
		assert(types.indexOf(type) >= 0, "Type " + selectKeyframeTypes[type] + "is invalid for field '" + this.props.field.n);
		/// #endif

		if(keyFrame.m !== type) {
			keyFrame.m = type;
			this.onKeyframeChanged(keyFrame);
		}
	}
	
	renderKeyframe(keyFrame, keyframeNum) {
		let loopArrow;
		let isSelected = isKeyframeSelected(keyFrame);
		let isNextOfSelected = selectedKeyframe && (selectedKeyframe.n === keyFrame);
		if(keyFrame.j !== keyFrame.t) {
			let len = Math.abs(keyFrame.j - keyFrame.t);
			len *= FRAMES_STEP;

			let className = 'loop-arrow';
			if(keyFrame.j > keyFrame.t) {
				className += ' loop-arrow-front';
			}

			loopArrow = R.svg({className, height:11, width:len},
				R.polyline({points:'0,0 6,6 3,8 0,0 6,9 '+(len/2)+',10 '+(len-3)+',7 '+len+',0'})
			);
		}
		let className = 'timeline-keyframe ' + keyframesClasses[keyFrame.m];
		if(isSelected) {
			className += ' timeline-keyframe-selected';
		} else if (isNextOfSelected) {
			className += ' timeline-keyframe-nextofselected';
		}
		
		let mark;
		if(keyFrame.hasOwnProperty('a')) {
			
			mark = (keyFrame.a === 'this.stop') ? '■' : 'A';
		}
		
		return R.div({key:keyframeNum, className:className, onMouseDown: (ev) => {
			if(ev.buttons === 2) {
				this.deleteKeyframe(keyFrame);
				sp(ev);
			} else {
				if(!this.selectKeyframe(keyFrame)) {
					this.forceUpdate();
				}
				let timeLineData = this.props.field.t;
				if ((timeLineData.indexOf(keyFrame) > 0) || ev.altKey) {
					if(ev.altKey) {
						let cloneKeyframe = {};
						Object.assign(cloneKeyframe, keyFrame);
						timeLineData.push(cloneKeyframe);
						keyFrame = cloneKeyframe;
					}

					draggingKeyframe = keyFrame;
					draggingTimeline = this;
						
					const onMouseUp = () => {
						window.removeEventListener('mouseup', onMouseUp);
							
						//reduce repeating keyframes
						let isModified = false;
							
						for(let i = 0; i < timeLineData.length; i++) {
							let kf = timeLineData[i];
							if((kf !== keyFrame) && (kf.t === keyFrame.t)) {
								timeLineData.splice(i, 1);
								i--;
								isModified = true;
							}
						}
							
						if(isModified) {
							Timeline.renormalizeFieldTimelineDataAfterChange(this.props.field);
							this.forceUpdate();
						}
					};
					window.addEventListener('mouseup', onMouseUp);
				}
			}
		},
		style:{left:keyFrame.t * FRAMES_STEP}},
		mark,
		loopArrow
		);
	}
	
	onKeyframeChanged(kf) {
		if(kf.m < 3) {
			delete kf.b; //JUMP ROOF, JUMP FLOOR  gravity and boouncing delete
			delete kf.g;
		} else {
			if(!kf.hasOwnProperty('b')) {
				kf.b = DEFAULT_BOUNCING;
				kf.g = DEFAULT_GRAVITY;
			}
		}
		
		if(kf.hasOwnProperty('a')) {
			if(!kf.a) {
				delete kf.a;
			}
		}
		
		Timeline.renormalizeFieldTimelineDataAfterChange(this.props.field);
		this.forceUpdate();
		keyframePropsEditor.forceUpdate();
	}
	
	deleteKeyframe(keyFrame) {
		let f = this.props.field;
		let i = f.t.indexOf(keyFrame);
		assert(i >= 0, "can't delete keyFrame.");
		if(i > 0) {
			f.t.splice(i, 1);
			Timeline.renormalizeFieldTimelineDataAfterChange(f);
			this.selectKeyframe(null);
			this.forceUpdate();
		}
	}
	
	selectKeyframe(kf) {
		if(isKeyframeSelected(kf)) {
			return true;
		}
		selectedKeyframe = kf;
		if(selectedTimeline) {
			selectedTimeline.forceUpdate();
		}
		selectedTimeline = this;
		if(kf) {
			this.forceUpdate();
		}
		keyframePropsEditor.forceUpdate();
	}
	
	static onMouseDrag(time, ev) {
		if(ev.buttons !== 1) {
			draggingKeyframe = null;
		}
		if(selectedKeyframe && selectedTimeline && ev.ctrlKey && ev.buttons === 1 && selectedKeyframe.j !== time) {
			selectedKeyframe.j = time;
			Timeline.renormalizeFieldTimelineDataAfterChange(selectedTimeline.props.field);
			selectedTimeline.forceUpdate();
		} else if(draggingKeyframe && (draggingKeyframe.t !== time)) {
			if(draggingKeyframe.j === draggingKeyframe.t) {
				draggingKeyframe.j = time;
			}
			draggingKeyframe.t = time;
			Timeline.timeline.setTime(time);
			Timeline.renormalizeFieldTimelineDataAfterChange(draggingTimeline.props.field);
			draggingTimeline.forceUpdate();
		}
	}
	
	onRemoveFieldClick() {
		editor.ui.modal.showQuestion("Field animation delete", "Are you sure you want to delete animation track for field '" + this.props.field.n + "'?",
			() => {
				Timeline.timeline.deleteAnimationField(this.props.field);
			}, 'Delete'
		);
	}

	onInsertFramesClicked() {
		let currentTime = Timeline.timeline.getTime();
		let t = this.props.field.t;
		let minTime = Number.MAX_VALUE;
		for(let f of t) {
			if(f.t > currentTime) {
				minTime = Math.min(minTime, f.t-1);
			}
			if(f.j > currentTime) {
				minTime = Math.min(minTime, f.j-1);
			}
		}

		minTime -= currentTime;

		editor.ui.modal.showPrompt('Enter framesCount to shift:', '0',
			(filterValue) => {
				return filterValue.replace(/[^\d-]/g, '');
			},
			(acceptValue) => {
				let v = parseInt(acceptValue);
				if(v < -minTime) {
					return 'Value can\'t be less that -' + minTime;	
				}
			}).then((enteredText) => {
			if(enteredText) {
				let v = parseInt(enteredText);
				for(let f of t) {
					if(f.t > currentTime) {
						f.t += v;
					}
					if(f.j > currentTime) {
						f.j += v;
					}
				}
				Timeline.renormalizeFieldTimelineDataAfterChange(this.props.field);
				this.forceUpdate();
			}
		});
	}
	
	gotoNextKeyframe(direction) {
		let field = this.props.field;
		let currentTime = Timeline.timeline.getTime();
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		
		let i = field.t.indexOf(currentKeyframe);
		
		let moved = (currentKeyframe.t - currentTime);
		
		if(!(((direction > 0) === (moved > 0)) && ((direction < 0) === (moved < 0)))) {
			i += direction;
			if(i < 0) {
				i = field.t.length -1;
			}
			else if(i >= field.t.length) {
				i = 0;
			}
		}
		this.selectKeyframe(field.t[i]);
		Timeline.timeline.setTime(field.t[i].t, true);
		
	}
	
	onGoLeftClick() {
		this.gotoNextKeyframe(-1);
	}
	
	onGoRightClick() {
		this.gotoNextKeyframe(1);
	}
	
	onToggleKeyframeClick(time) {
		let field = this.props.field;
		let currentTime = time || Timeline.timeline.getTime();
		let currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		if(currentKeyframe.t !== currentTime) {
			Timeline.timeline.createKeyframeWithTimelineValue(field, currentTime);
			this.forceUpdate();
		} else {
			this.deleteKeyframe(currentKeyframe);
		}
	}
	
	render() {
		let field = this.props.field;
		
		let label = R.div(fieldLabelTimelineProps,
			field.n,
			R.br(),
			R.btn('x', this.onRemoveFieldClick, 'Remove field animation...', 'danger-btn'),
			R.btn('⇄', this.onInsertFramesClicked, 'Insetr frames at current position'),
			R.btn('<', this.onGoLeftClick, 'Previous Keyframe'),
			R.btn('●', this.onToggleKeyframeClick, 'add/remove Keyframe'),
			R.btn('>', this.onGoRightClick, 'Next Keyframe')
			
		);
		
		let lastKeyframe = field.t[field.t.length - 1];
		let width = 0;
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
		
		if(!field.__cacheTimelineRendered) {
			if(isNaN(field.__cacheTimeline.max)) {
				field.__cacheTimelineRendered = R.span();
			} else {
				field.__cacheTimelineRendered = R.svg({className:'timeline-chart', height:'27', width},
					R.polyline({points:field.t.map(this.renderKeyframeChart, field).join(' ')})
				);
			}
		}
		

		
		let draging;
		if(draggingKeyframe && (field.t.indexOf(draggingKeyframe) >= 0)) {
			draging = this.renderKeyframe(draggingKeyframe);
		}
		
		return R.div({className: 'field-timeline', onMouseDown:(ev) =>{
			if(ev.buttons === 2) {
				this.onToggleKeyframeClick(Timeline.timeline.mouseTimelineTime);
			}
		}},
		R.div({style:{width}},
			label,
			field.t.map(this.renderKeyframe)
		),
		draging,
		field.__cacheTimelineRendered,
		React.createElement(PlayingDisplay, this.props)
		);
	}
}

let draggingKeyframe, draggingTimeline;

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


let selectedKeyframe, selectedTimeline;

let selectKeyframeTypes = ['SMOOTH', 'LINEAR', 'DISCRETE', 'JUPM FLOOR', 'JUMP ROOF'];
let keyframePropsEditor;

export class KeyframePropertyEditor extends React.Component {
	
	constructor(props) {

		super(props);
		keyframePropsEditor = this;
		this.onActionChange = this.onActionChange.bind(this);
		this.onGravityChange = this.onGravityChange.bind(this);
		this.onBouncingChange = this.onBouncingChange.bind(this);
		this.onSetSpeeedExistsChanged = this.onSetSpeeedExistsChanged.bind(this);
		this.onSpeedChanged = this.onSpeedChanged.bind(this);
		this.onJumpExistsChanged = this.onJumpExistsChanged.bind(this);
		this.onJumpChanged = this.onJumpChanged.bind(this);
		this.onDemptChanged = this.onDemptChanged.bind(this);
		this.onPowChanged = this.onPowChanged.bind(this);
		this.onPresetSelected = this.onPresetSelected.bind(this);
	}

	onKeyframeChanged(kf) {
		selectedTimeline.onKeyframeChanged(kf);
	}


	onGravityChange(ev) {
		let kf = selectedKeyframe;
		kf.g = parseFloat(ev.target.value);
		this.onKeyframeChanged(kf);
	}
	
	onBouncingChange(ev) {
		let kf = selectedKeyframe;
		kf.b = parseFloat(ev.target.value);
		this.onKeyframeChanged(kf);
	}
	
	onActionChange(ev) {
		let kf = selectedKeyframe;
		kf.a = ev.target.value;
		this.onKeyframeChanged(kf);
	}
	
	onSpeedChanged(ev) {
		let kf = selectedKeyframe;
		kf.s = parseFloat(ev.target.value);
		this.onKeyframeChanged(kf);
		this.forceUpdate();
	}
	
	onSetSpeeedExistsChanged(ev) {
		let kf = selectedKeyframe;
		if(ev.target.checked) {
			kf.s = 0;
		} else {
			delete kf.s;
		}
		this.onKeyframeChanged(kf);
	}
	
	onJumpExistsChanged(ev) {
		let kf = selectedKeyframe;
		if(ev.target.checked) {
			kf.j = 0;
		} else {
			delete kf.j;
		}
		this.onKeyframeChanged(kf);
	}
	
	onJumpChanged(ev) {
		let kf = selectedKeyframe;
		kf.j = Math.round(ev.target.value);
		this.onKeyframeChanged(kf);
		this.forceUpdate();
	}
	
	onDemptChanged(ev) {
		let val =  parseFloat(ev.target.value);
		editor.selection.some((o) => {
			o._timelineData.d = val;
		});
		this.onKeyframeChanged(selectedKeyframe);
		editor.sceneModified();
		Timeline.renormalizeWholeTimelineData(selectedTimeline.props.node._timelineData);
		this.forceUpdate();
	}
	
	onPowChanged(ev) {
		let val =  parseFloat(ev.target.value);
		editor.selection.some((o) => {
			o._timelineData.p = val;
		});
		this.onKeyframeChanged(selectedKeyframe);
		editor.sceneModified();
		Timeline.renormalizeWholeTimelineData(selectedTimeline.props.node._timelineData);
		this.forceUpdate();
	}
	
	onPresetSelected(ev) {
		editor.selection.some((o) => {
			Object.assign(o._timelineData, ev.target.value);
		});
		this.onKeyframeChanged(selectedKeyframe);
		editor.sceneModified();
		Timeline.renormalizeWholeTimelineData(selectedTimeline.props.node._timelineData);
		this.forceUpdate();
	}

	render () {
		let kf = selectedKeyframe;
		let selectedObjectsTimeline = editor.selection[0]._timelineData;
		if((!kf) || (!selectedObjectsTimeline)) {
			return R.div();
		}
		
		let extendEditor;
		if(kf.m > 2 ) { //JUMP ROOF, JUMP FLOOR
			extendEditor = R.span(null,
				' Gravity: ' ,React.createElement(NumberEditor, {value: kf.g, type:'number', step:0.0001, min: 0.0001, max: 10, onChange: this.onGravityChange}),
				' Bouncing: ' ,React.createElement(NumberEditor, {value: kf.b, type:'number', step:0.01, min: 0.01, max: 10, onChange: this.onBouncingChange})
			);
		} else if(kf.m === 0) { //SMOOTH
			
			let presetSelectedValue = presets.find((p) => {
				return selectedObjectsTimeline.p === p.value.p && selectedObjectsTimeline.d === p.value.d;
			}) || presets[0];
			
			extendEditor = R.span(null,
				' Power: ' ,React.createElement(NumberEditor, {value: selectedObjectsTimeline.p, type:'number', step:0.001, min: 0.001, max: 0.9, onChange: this.onPowChanged}),
				' Dempt: ' ,React.createElement(NumberEditor, {value: selectedObjectsTimeline.d, type:'number', step:0.01, min: 0.01, max: 0.99, onChange: this.onDemptChanged}),
				' Preset ', React.createElement(SelectEditor, {value:presetSelectedValue.value, onChange: this.onPresetSelected, select:presets})
			);
		}
		
		let hasSpeed =  kf.hasOwnProperty('s');
		let speedEditor;
		if(hasSpeed) {
			speedEditor = React.createElement(NumberEditor, {value: kf.s, type:'number', step:0.1, min: -1000, max: 1000, onChange: this.onSpeedChanged});
		}
		
		let hasJump = kf.hasOwnProperty('j');
		let jumpEditor;
		if(hasJump) {
			jumpEditor = React.createElement(NumberEditor, {value: kf.j, type:'number', step:1, min: 0, max: 99999999, onChange: this.onJumpChanged});
		}
		
		let selectableKeyframeTypes = Timeline.getKeyframeTypesForField(editor.selection[0], selectedTimeline.props.field.n).map((mode) => {
			return {name:selectKeyframeTypes[mode] , value:mode};
		});

		return R.div({className: 'bottom-panel'},
			' action: ',
			React.createElement(CallbackEditor, {value:kf.a || null, onChange:this.onActionChange, title:'Callback for keyframe ' + kf.t}),
			' ',
			React.createElement(SelectEditor, {onChange:(ev) => {
				selectedTimeline.setKeyframeType(kf, ev.target.value);
			}, value:kf.m, select: selectableKeyframeTypes}),
			R.label({htmlFor:'speed-set-checkbox'}, ' speed set:'),
			R.input({id: 'speed-set-checkbox', type:'checkbox', onChange: this.onSetSpeeedExistsChanged, checked:hasSpeed}),
			speedEditor,
			R.label({htmlFor:'jump-time-checkbox'}, ' jump time:'),
			R.input({id: 'jump-time-checkbox', type:'checkbox', onChange: this.onJumpExistsChanged, checked:hasJump}),
			jumpEditor,
			extendEditor
		);
	}
}

const presets = [
	{name : 'None', value:{}},
	{name: 'Alive', value:{
		d:0.85,
		p:0.02
	}},
	{name: 'Bouncy', value:{
		d:0.95,
		p:0.03
	}},
	{name: 'Baloon', value:{
		d:0.9,
		p:0.001
	}},
	{name: 'Fast', value:{
		d:0.85,
		p:0.05
	}},
	{name: 'Inert', value:{
		d:0.98,
		p:0.002
	}}
];

function isKeyframeSelected(kf) {
	return selectedKeyframe === kf;
}

class PlayingDisplay extends React.Component {
	componentDidMount() {
		this.interval = setInterval(this.update.bind(this), 35);
	}
	
	componentWillUnmount() {
		clearInterval(this.interval);
	}
	
	update() {
		let fieldPlayer = this.props.node.fieldPlayers[this.props.fieldIndex];
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
				firedFrame = R.div({className:'timeline-fire-indicator', style:{left: this.fieldPlayer.__lastFiredKeyframe.t * FRAMES_STEP}});
			}
			return R.fragment(
				R.div({className:'timeline-play-indicator', style:{left: this.fieldPlayer.time * FRAMES_STEP}}),
				firedFrame
			);
		}
		
	}
}