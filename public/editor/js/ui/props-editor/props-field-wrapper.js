import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';
import BooleanEditor from './boolean-editor.js';
import SelectEditor from './select-editor.js';
import ColorEditor from './color-editor.js';
import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";
import TimelineEditor from "./timeline/timeline-property.js";


var typeDescriptions = new WeakMap();
typeDescriptions[Number] = {
	renderer: NumberEditor,
	parser: (target) => {
		return parseFloat(target.value)
	},
	default: 0
};
typeDescriptions[String] = {
	renderer: StringEditor,
	parser: (target) => {
		return target.value || null;
	},
	default: null
};
typeDescriptions[Boolean] = {
	renderer: BooleanEditor,
	parser: (target) => {
		return target.checked
	},
	default: false
};
typeDescriptions['color'] = {
	renderer: ColorEditor, parser:
		(target) => {
			return parseInt(target.value.replace('#', ''), 16)
		},
	default: 0xFFFFFF
};

typeDescriptions['timeline'] = {
	renderer: TimelineEditor,
	parser:
		(movieClip) => {
			return movieClip.timeline;
		},
	default:null
};


var getTypeDescription = (field) => {
	return typeDescriptions[field.type || Number];
}

var fieldProps = {className: 'props-field'};

var labelProps = {className: 'props-label selectable-text', onMouseDown: function (ev) {
	selectText(ev.target);
	sp(ev);
}};
var wrapperProps = {className: 'props-wrapper'};

class PropsFieldWrapper extends React.Component {
	
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
	}
	
	onChange(ev, delta, deltaVal) {
		delta = (delta === true);
		var field = this.props.field;
		var val = getTypeDescription(field).parser(ev.target);
		var initialVal = val;
		
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
		var field = this.props.field;
		var node = editor.selection[0];
		editor.ui.propsEditor.__isPropsRenderingAccessTime = true;
		var value = node[field.name];
		editor.ui.propsEditor.__isPropsRenderingAccessTime = false;
		
		var renderer;
		if (field.hasOwnProperty('select')) {
			renderer = SelectEditor;
		} else {
			renderer = getTypeDescription(field).renderer;
		}
		
		var disabled = field.name === 'name' && node.parent === game.stage;
		
		return R.div(fieldProps,
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

var _surrogateEventObj = {target: {value: 0}};
PropsFieldWrapper.surrogateChnageEvent = (val) => {
	_surrogateEventObj.target.value = val;
	return _surrogateEventObj;
};

PropsFieldWrapper.getTypeDescription = getTypeDescription;

export default PropsFieldWrapper