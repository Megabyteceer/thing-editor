import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';
import BooleanEditor from './boolean-editor.js';
import SelectEditor from './select-editor.js';
import ColorEditor from './color-editor.js';
import TimelineEditor from "./timeline/timeline-property.js";
import DataPathEditor from "./data-path-editor.js";
import CallbackEditor from "./callback-editor.js";
import BtnProperty from "./btn-property.js";
import TilemapEditor from "./tilemap-editor.js";


let typeDescriptions = new Map();

typeDescriptions.set(Number, {
	renderer: NumberEditor,
	parser: (target) => {
		return parseFloat(target.value);
	},
	default: 0
});
typeDescriptions.set(String, {
	renderer: StringEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});
typeDescriptions.set(Boolean, {
	renderer: BooleanEditor,
	parser: (target) => {
		return target.checked;
	},
	default: false
});

typeDescriptions.set('data-path', {
	renderer: DataPathEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});

typeDescriptions.set('callback', {
	renderer: CallbackEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
});

typeDescriptions.set('btn', {
	renderer: BtnProperty,
	default: null
});

typeDescriptions.set('color', {
	renderer: ColorEditor, parser:
		(target) => {
			return parseInt(target.value.replace('#', ''), 16);
		},
	default: 0xFFFFFF
});

typeDescriptions.set('timeline', {
	renderer: TimelineEditor,
	default:null
});

typeDescriptions.set('tilemap', {
	renderer: TilemapEditor,
	default:null
});


let getTypeDescription = (field) => {
	let t = field.type || Number;
	assert(typeDescriptions.has(t), "Unknown editable property type: " + t);
	return typeDescriptions.get(t);
};

let labelProps = {className: 'props-label selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};
let wrapperProps = {className: 'props-wrapper'};

class PropsFieldWrapper extends React.Component {
	
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
	}
	
	onChange(ev, delta, deltaVal) {
		delta = (delta === true);
		let field = this.props.field;
		let val = getTypeDescription(field).parser(ev.target);
		if(field.hasOwnProperty('parser')){
			val = field.parser(val);
		}
		
		if (field.hasOwnProperty('min')) {
			val = Math.max(field.min, val);
		}
		if (field.hasOwnProperty('max')) {
			val = Math.min(field.max, val);
		}
		if(delta) {
			this.props.onChange(field, deltaVal, true);
		} else {
			this.props.onChange(field, val);
		}
		
		this.setState({value: val});
	}
	
	render() {
		let field = this.props.field;
		let node = editor.selection[0];
		editor.ui.propsEditor.__isPropsRenderingAccessTime = true;
		let value = node[field.name];
		editor.ui.propsEditor.__isPropsRenderingAccessTime = false;
		
		let renderer;
		if (field.hasOwnProperty('select')) {
			renderer = SelectEditor;
		} else {
			renderer = getTypeDescription(field).renderer;
		}
		
		let disabled = field.disabled && field.disabled(node);
		
		let tip;
		if(field.hasOwnProperty('tip')) {
			tip = R.tip(field.name,
				'Field "' + field.name + '" description:',
				field.tip
			);
		}
		
		return R.div({className: field.important ? 'props-field props-field-important' : 'props-field', id:'property-editor-' + field.name},
			tip,
			R.div(labelProps, field.name),
			R.div(wrapperProps,
				React.createElement(renderer, {
					value,
					onChange: this.onChange,
					field,
					disabled
				})
			));
	}
}

let _surrogateEventObj = {target: {value: 0}};
PropsFieldWrapper.surrogateChnageEvent = (val) => {
	_surrogateEventObj.target.value = val;
	return _surrogateEventObj;
};

PropsFieldWrapper.getTypeDescription = getTypeDescription;

export default PropsFieldWrapper;