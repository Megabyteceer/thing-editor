import CallbackEditor from "../callback-editor.js";
import Timeline from "./timeline.js";
import NumberEditor from "../number-editor.js";
import SelectEditor from "../select-editor.js";

const DEFAULT_GRAVITY = 1; //JUMP ROOF, JUMP FLOOR default gravity and boouncing
const DEFAULT_BOUNCING = 0.4;

// m - mode (0 - SMOOTH, 1 - LINEAR, 2 - DISCRETE, 3 - JUMP FLOOR, 4 - JUMP ROOF)
// v - target value

// s - speed set

// t - time
// j - time to jump (loop time)
// r - random delay (max random value to decrease distance to next keyframe

// a - action (callback)

// g,b - gravity,bouncing for JUMP keyframes


export default class KeyframePropertyEditor extends React.Component {
	
	constructor(props) {

		super(props);
		this.onActionChange = this.onActionChange.bind(this);
		this.onGravityChange = this.onGravityChange.bind(this);
		this.onBouncingChange = this.onBouncingChange.bind(this);
		this.onSetSpeeedExistsChanged = this.onSetSpeeedExistsChanged.bind(this);
		this.onSetRandomExistsChanged = this.onSetRandomExistsChanged.bind(this);
		this.onSpeedChanged = this.onSpeedChanged.bind(this);
		this.onRandomChanged = this.onRandomChanged.bind(this);
		this.onJumpChanged = this.onJumpChanged.bind(this);
		this.resetJumpTime = this.resetJumpTime.bind(this);
		this.onDemptChanged = this.onDemptChanged.bind(this);
		this.onPowChanged = this.onPowChanged.bind(this);
		this.onPresetSelected = this.onPresetSelected.bind(this);
		this.onTypeSelect = this.onTypeSelect.bind(this);
	}

	onKeyframeChanged() {
		for(let k of this.props.keyframes) {

			let kf = k.props.keyFrame;
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
			kf.___view.onChanged();
		}
		this.forceUpdate();
	}

	onObjectChanged() {
		for(let k of this.props.keyframes) {
			let objectTimelineEditor = k.props.owner.props.owner.props.owner;
			Timeline.allFieldDataChanged(objectTimelineEditor.props.node);
			objectTimelineEditor.forceUpdate();
		}
		this.forceUpdate();
	}

	onGravityChange(ev) {
		let val = parseFloat(ev.target.value);
		for(let k of this.props.keyframes) {
			k.props.keyFrame.g = val;
		}
		this.onKeyframeChanged();
	}
	
	onBouncingChange(ev) {
		let val = parseFloat(ev.target.value);
		for(let k of this.props.keyframes) {
			k.props.keyFrame.b = val;
		}
		this.onKeyframeChanged();
	}
	
	onActionChange(ev) {
		for(let k of this.props.keyframes) {
			k.props.keyFrame.a = ev.target.value;
		}
		this.onKeyframeChanged();
	}
	
	onSpeedChanged(ev) {
		let val = parseFloat(ev.target.value);
		for(let k of this.props.keyframes) {
			k.props.keyFrame.s = val;
		}
		this.onKeyframeChanged();
	}

	onRandomChanged(ev) {
		let val = parseInt(ev.target.value);
		for(let k of this.props.keyframes) {
			k.props.keyFrame.r = val;
		}
		this.onKeyframeChanged();
	}
	
	onSetSpeeedExistsChanged(ev) {
		for(let k of this.props.keyframes) {
			if(ev.target.checked) {
				k.props.keyFrame.s = 0;
			} else {
				delete k.props.keyFrame.s;
			}
			
		}
		this.onKeyframeChanged();
	}

	onSetRandomExistsChanged(ev) {
		for(let k of this.props.keyframes) {
			if(ev.target.checked) {
				k.props.keyFrame.r = 0;
			} else {
				delete k.props.keyFrame.r;
			}
		}
		this.onKeyframeChanged();
	}

	onJumpChanged(ev) {
		let val = parseFloat(ev.target.value);
		for(let k of this.props.keyframes) {
			k.props.keyFrame.j = val;
		}
		this.onKeyframeChanged();
	}

	resetJumpTime() {
		for(let k of this.props.keyframes) {
			k.props.keyFrame.j = k.props.keyFrame.t;
		}
		this.onKeyframeChanged();
	}

	onDemptChanged(ev) {
		let val =  parseFloat(ev.target.value);
		for(let k of this.props.keyframes) {
			let o = k.props.owner.props.owner.props.owner.props.node;
			o._timelineData.d = val;
		}
		this.onObjectChanged();
	}
	
	onPowChanged(ev) {
		let val =  parseFloat(ev.target.value);
		for(let k of this.props.keyframes) {
			let o = k.props.owner.props.owner.props.owner.props.node;
			o._timelineData.p = val;
		}
		this.onObjectChanged();
	}
	
	onPresetSelected(ev) {
		for(let k of this.props.keyframes) {
			let o = k.props.owner.props.owner.props.owner.props.node;
			Object.assign(o._timelineData, ev.target.value);
		}
		this.onObjectChanged();
	}

	onTypeSelect(ev) {
		for(let kfView of this.props.keyframes) {
			kfView.setKeyframeType(ev.target.value);
		}
		this.onKeyframeChanged();
		this.forceUpdate();
	}

	render () {

		let kfView = this.props.keyframes[0];
		if(!kfView) {
			return R.fragment();
		}
		let kf = kfView.props.keyFrame;

		let selectableKeyframeTypes = Timeline.getKeyframeTypesForField(editor.selection, kfView.props.owner.props.owner.props.field.n).map((mode) => {
			return {name:KeyframePropertyEditor.selectKeyframeTypes[mode] , value:mode};
		});
		let keyframeTypeSelect = React.createElement(SelectEditor, {onChange:this.onTypeSelect, value:kf.m, select: selectableKeyframeTypes});

		let body;
		if(this.props.keyframes.length > 1) {
			body = keyframeTypeSelect;
		} else {

			let selectedObjectsTimeline = kfView.props.owner.props.owner.props.owner.props.node._timelineData;
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
					' Preset ' ,React.createElement(SelectEditor, {value:presetSelectedValue.value, onChange: this.onPresetSelected, select:presets})
				);
			}
			
			let hasSpeed =  kf.hasOwnProperty('s');
			let speedEditor;
			if(hasSpeed) {
				let edFied = editor.getObjectField(editor.selection[0], kf.___view.props.owner.props.owner.props.field.n);
				speedEditor = React.createElement(NumberEditor, {value: kf.s, type:'number', step:(edFied.step || 1) / 10, min: -1000, max: 1000, onChange: this.onSpeedChanged});
			}
			let hasRandom =  kf.hasOwnProperty('r');
			let randomEditor;
			if(hasRandom) {
				randomEditor = React.createElement(NumberEditor, {value: kf.r, type:'number', step:1, min: -1000, max:kf.n.t - kf.j - 1, onChange: this.onRandomChanged});
			}

			let jumpReset;
			if(kf.j !== kf.t) {
				jumpReset = R.btn('x', this.resetJumpTime, "Remove loop point");
			}
			let jumpEditor = React.createElement(NumberEditor, {value: kf.j, type:'number', step:1, min: 0, max: 99999999, onChange: this.onJumpChanged});

			body = R.fragment(
				' action: ',
				React.createElement(CallbackEditor, {value:kf.a || null, onChange:this.onActionChange, title:'Callback for keyframe ' + kf.t}),
				' ',
				keyframeTypeSelect,
				R.label({htmlFor:'speed-set-checkbox'}, ' speed set:'),
				R.input({id: 'speed-set-checkbox', type:'checkbox', onChange: this.onSetSpeeedExistsChanged, checked:hasSpeed}),
				speedEditor,
				R.label({htmlFor:'random-set-checkbox', title: 'Next frame will be reached for random time longer that defined on timeline'}, ' random time:'),
				R.input({id: 'random-set-checkbox', type:'checkbox', onChange: this.onSetRandomExistsChanged, checked:hasRandom}),
				randomEditor,
				R.label({htmlFor:'jump-time-checkbox'}, ' jump time:'),
				jumpEditor,
				jumpReset,
				extendEditor
			);
		}

		return R.div({className: 'bottom-panel'},
			body
		);
	}
}

KeyframePropertyEditor.selectKeyframeTypes = ['SMOOTH', 'LINEAR', 'DISCRETE', 'JUPM FLOOR', 'JUMP ROOF'];

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
