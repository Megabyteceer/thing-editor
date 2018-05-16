import Timeline from "./timeline.js";
import Pool from "/engine/js/utils/pool.js";
import FieldPlayer from "/engine/js/components/movie-clip/field-player.js";
import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";
import SelectEditor from "../select-editor.js";

const FRAMES_STEP = 3;
const DEFAULT_GRAVITY = 1; //JUMP ROOF, JUMP FLOOR default gravity and boouncing
const DEFAULT_BOUNCING = 0.4;

const keyframesClasses = [
	'timeline-keyframe-smooth',
	'timeline-keyframe-linear',
	'timeline-keyframe-discrete',
	'timeline-keyframe-jump-floor',
	'timeline-keyframe-jump-roof'
]

var fieldLabelTimelineProps = {className: 'objects-timeline-labels', onMouseDown:sp, onMouseMove:sp};

var _scale, _shift;
const scale = (val) => {
	return (_shift - val) * _scale;
}

export default class FieldsTimeline extends React.Component {
	
	constructor(props) {
		super(props);
		this.deleteKeyframe = this.deleteKeyframe.bind(this);
		this.renderKeyframeChart = this.renderKeyframeChart.bind(this);
		this.renderKeyframe = this.renderKeyframe.bind(this);
		this.onKeyframeChanged = this.onKeyframeChanged.bind(this);
		this.onRemoveFieldClick = this.onRemoveFieldClick.bind(this);
		this.onGoLeftClick = this.onGoLeftClick.bind(this);
		this.onGoRightClick = this.onGoRightClick.bind(this);
		this.onToggleKeyframeClick = this.onToggleKeyframeClick.bind(this);
		this.toggleKeyframeType = this.toggleKeyframeType.bind(this);
	}
	
	componentWillUnmount() {
		if(selectedTimeline === this) {
			selectedTimeline = null;
			selectedKeyframe = null;
		}
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
				case 3:
				case 4:
					var ret = [];
					for(let i = keyFrame.t+1; i <= n.t; i++) {
						ret.push((i * FRAMES_STEP) + ',' + scale(this.getValueAtTime(i)));
					}
					return ret.join(' ');
				case 1: //linear
					return (keyFrame.t * FRAMES_STEP) + ',' + scale(this.getValueAtTime(keyFrame.t)) + ' ' + (n.t * FRAMES_STEP) + ',' + scale(n.v);
				case 2: //discrete
					var v = scale(this.getValueAtTime(keyFrame.t));
					var t = n.t * FRAMES_STEP;
					return (keyFrame.t * FRAMES_STEP) + ',' + v + ' ' + t + ',' + v + ' ' + t + ',' + scale(n.v);
			}
		}
		return '';
	}
	
	toggleKeyframeType(keyFrame) {
		var types = Timeline.getKeyframeTypesForField(editor.selection[0], this.props.field.n);
		var i = types.indexOf(keyFrame.m);
		keyFrame.m = types[(i + 1) % types.length];
		this.onKeyframeChanged(keyFrame);
	}
	
	renderKeyframe(keyFrame) {
		var loopArrow;
		var isSelected = isKeyframeSelected(keyFrame);
		var isNextOfSelected = selectedKeyframe && (selectedKeyframe.n === keyFrame);
		if(keyFrame.j !== keyFrame.t) {
			var len = Math.abs(keyFrame.j - keyFrame.t);
			len *= FRAMES_STEP;
			loopArrow = R.svg({className:'loop-arrow', height:11, width:len},
				R.polyline({points:'0,0 6,6 3,8 0,0 6,9 '+(len/2)+',10 '+(len-3)+',7 '+len+',0'})
			);
		}
		var className = 'timeline-keyframe ' + keyframesClasses[keyFrame.m];
		if(isSelected) {
			className += ' timeline-keyframe-selected';
		} else if (isNextOfSelected) {
			className += ' timeline-keyframe-nextofselected';
		}
		
		var mark;
		if(keyFrame.hasOwnProperty('a')) {
			mark = 'A';
		}
		
		return R.div({key:keyFrame.t, className:className, onMouseDown: (ev) => {
				if(ev.buttons === 2) {
					this.deleteKeyframe(keyFrame);
					sp(ev);
				} else {
					if (this.props.field.t.indexOf(keyFrame) > 0) {
						draggingKeyframe = keyFrame;
						draggingTimeline = this;
					}
				}
			}, onClick:(ev) => {
				if(this.selectKeyframe(keyFrame)) {
					//this.toggleKeyframeType(keyFrame);
				} else {
					this.forceUpdate();
				}
			},style:{left:keyFrame.t * FRAMES_STEP}},
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
	}
	
	deleteKeyframe(keyFrame) {
		var f = this.props.field;
		var i = f.t.indexOf(keyFrame);
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
	}
	
	static onMouseDrag(time, buttons) {
		if(buttons !== 1) {
			draggingKeyframe = null;
		}
		if(draggingKeyframe && (draggingKeyframe.t !== time)) {
			if(draggingKeyframe.j === draggingKeyframe.t) {
				draggingKeyframe.j = time;
			}
			draggingKeyframe.t = time;
			Timeline.renormalizeFieldTimelineDataAfterChange(draggingTimeline.props.field);
			draggingTimeline.forceUpdate();
		}
	}
	
	onRemoveFieldClick() {
		editor.ui.modal.showQuestion("Field animation delete", "Are you sure you want to delete animation track for field '" + this.props.field.n + "'?",
			() => {
				Timeline.timeline.deleteAnimationField(this.props.field);
			}, 'Delete'
		)
	}
	
	gotoLabel(direction) {
		var field = this.props.field
		var currentTime = Timeline.timeline.getTime();
		var currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		
		var i = field.t.indexOf(currentKeyframe);
		i += direction;
		if(i < 0) {
			i = field.t.length -1;
		}
		else if(i >= field.t.length) {
			i = 0;
		}
		Timeline.timeline.setTime(field.t[i].t, true);
	}
	
	onGoLeftClick() {
		this.gotoLabel(-1);
	}
	
	onGoRightClick() {
		this.gotoLabel(1);
	}
	
	onToggleKeyframeClick(time) {
		var field = this.props.field
		var currentTime = time || Timeline.timeline.getTime();
		var currentKeyframe = MovieClip._findNextKeyframe(field.t, currentTime-1);
		if(currentKeyframe.t !== currentTime) {
			Timeline.timeline.createKeyframeAtFieldData(field, currentTime);
			this.forceUpdate();
		} else {
			this.deleteKeyframe(currentKeyframe);
		}
	}
	
	render() {
		var field = this.props.field;
		
		var label = R.div(fieldLabelTimelineProps,
			field.n,
			R.br(),
			R.btn('×', this.onRemoveFieldClick, 'Remove field animation...', 'danger-btn'),
			R.btn('<', this.onGoLeftClick, 'Previous Keyframe'),
			R.btn('●', this.onToggleKeyframeClick, 'add/remove Keyframe'),
			R.btn('>', this.onGoRightClick, 'Next Keyframe'),
			
		);
		
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
		
		if(!field.__cacheTimelineRendered) {
			field.__cacheTimelineRendered = R.svg({className:'timeline-chart', height:'27', width},
				R.polyline({points:field.t.map(this.renderKeyframeChart, field).join(' ')})
			)
		}
		
		var keyframePropsEditor;
		if(selectedKeyframe && field.t.indexOf(selectedKeyframe) >= 0) {
			keyframePropsEditor = React.createElement(KeyframePropertyEditor, {toggleKeyframeType:this.toggleKeyframeType, onKeyframeChanged: this.onKeyframeChanged, timelineData:field, ref: this.keyframePropretyEditorRef, keyFrame: selectedKeyframe});
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
			field.__cacheTimelineRendered,
			keyframePropsEditor
		);
	}
}

var draggingKeyframe, draggingTimeline;

const calculateCacheSegmentForField = (fieldPlayer, c) => {
	fieldPlayer.__dontCallActions = true;
	var time;
	var i = 0;
	var fields = fieldPlayer.timeline;
	var limit = fields[fields.length-1].t;
	while(!c.hasOwnProperty(fieldPlayer.time)) {
		time = fieldPlayer.time;
		if(time > limit) {
			break;
		}
		fieldPlayer.update();
		c[time] = fieldPlayer.val;
		assert(i++ < 100000, 'Timeline values cache calculation looped and failed.');
	}
	fieldPlayer.__dontCallActions = false;
}


var selectedKeyframe, selectedTimeline;

var selectKeyframeTypes = ['SMOOTH', 'LINEAR', 'DISCRETE', 'JUPM FLOOR', 'JUMP ROOF'];

class KeyframePropertyEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onActionChange = this.onActionChange.bind(this);
		this.onGravityChange = this.onGravityChange.bind(this);
		this.onBouncingChange = this.onBouncingChange.bind(this);
		this.onSetSpeeedExistsChanged = this.onSetSpeeedExistsChanged.bind(this);
		this.onSpeedChanged = this.onSpeedChanged.bind(this);
		this.onJumpExistsChanged = this.onJumpExistsChanged.bind(this);
		this.onJumpChanged = this.onJumpChanged.bind(this);
	}
	
	onGravityChange(ev) {
		var kf = selectedKeyframe;
		kf.g = parseFloat(ev.target.value);
		this.props.onKeyframeChanged(kf);
	}
	
	onBouncingChange(ev) {
		var kf = selectedKeyframe;
		kf.b = parseFloat(ev.target.value);
		this.props.onKeyframeChanged(kf);
	}
	
	onActionChange(ev) {
		var kf = selectedKeyframe;
		kf.a = ev.target.value;
		this.props.onKeyframeChanged(kf);
	}
	
	onSpeedChanged(ev) {
		var kf = selectedKeyframe;
		kf.s = parseFloat(ev.target.value);
		this.props.onKeyframeChanged(kf);
		this.forceUpdate();
	}
	
	onSetSpeeedExistsChanged(ev) {
		var kf = selectedKeyframe;
		if(ev.target.checked) {
			kf.s = 0;
		} else {
			delete kf.s;
		}
		this.props.onKeyframeChanged(kf);
	}
	
	onJumpExistsChanged(ev) {
		var kf = selectedKeyframe;
		if(ev.target.checked) {
			kf.j = 0;
		} else {
			kf.j = kf.t;
		}
		this.props.onKeyframeChanged(kf);
	}
	
	onJumpChanged(ev) {
		var kf = selectedKeyframe;
		kf.j = Math.round(ev.target.value);
		this.props.onKeyframeChanged(kf);
		this.forceUpdate();
	}
	
	render () {
		var kf = selectedKeyframe;
		if(!kf) {
			return R.div();
		}
		
		var rgavityAndBouncingEditor;
		if(kf.m > 2 ) { //JUMP ROOF, JUMP FLOOR
			rgavityAndBouncingEditor = R.span(null,
				' gravity: ' ,R.input({value: kf.g, type:'number', step:0.01, min: 0.01, max: 10, onChange: this.onGravityChange}),
				' bouncing: ' ,R.input({value: kf.b, type:'number', step:0.01, min: 0.01, max: 10, onChange: this.onBouncingChange})
			)
		}
		
		var b = Timeline.getTimelineWindowBounds();
		
		var hasSpeed =  kf.hasOwnProperty('s');
		var speedEditor;
		if(hasSpeed) {
			speedEditor = R.input({value: kf.s, type:'number', step:0.1, min: -1000, max: 1000, onChange: this.onSpeedChanged});
		}
		
		var hasJump = kf.j !== kf.t;
		var jumpEditor;
		if(hasJump) {
			jumpEditor = R.input({value: kf.j, type:'number', step:1, min: 0, max: 99999999, onChange: this.onJumpChanged});
		}
		
		return R.div({className: 'bottom-panel', style:{left: b.left, width:b.width, bottom: window.document.body.clientHeight - b.bottom}},
			' action: ', R.input({value:kf.a, onChange:this.onActionChange}),
			' ', R.span({className:'clickable', onMouseDown:() => {this.props.toggleKeyframeType(kf);}}, selectKeyframeTypes[kf.m]), ' ',
			rgavityAndBouncingEditor,
			' speed set: ',
			R.input({type:'checkbox', onChange: this.onSetSpeeedExistsChanged, checked:hasSpeed}),
			speedEditor,
			' jump time: ',
			R.input({type:'checkbox', onChange: this.onJumpExistsChanged, checked:hasJump}),
			jumpEditor
		);
	}
}

function isKeyframeSelected(kf) {
	return selectedKeyframe === kf;
}