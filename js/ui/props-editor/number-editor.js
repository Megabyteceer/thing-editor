import PropsFieldWrapper from './props-field-wrapper.js';

const numberEditorProps = {className:'number-input'};

let draggingElement;
let lastY;

$(window).on('mousemove', (ev) => {
	if (!ev.buttons) draggingElement = undefined;
	if (!draggingElement) return;
	
	let d = Math.round((lastY - ev.clientY) / 2.001);
	if (d !== 0) {
		d = d * (draggingElement.props.field.step || 1);
		lastY = ev.clientY;
		draggingElement.deltaValue(d, ev.ctrlKey);
	}
});

class NumberEditor extends React.Component {
	constructor (props){
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onUpClick = this.onUpClick.bind(this);
		this.onDownClick = this.onDownClick.bind(this);
		this.btnUp = R.span({className:'number-input-btn-up', onClick:this.onUpClick, onMouseDown:this.onMouseDown}, '▲');
		this.btnDown = R.span({className:'number-input-btn-down', onClick:this.onDownClick, onMouseDown:this.onMouseDown}, '▼');
	}

	onUpClick(ev) {
		this.deltaValue(this.props.field.step || 1, ev.ctrlKey);
	}
		
	onDownClick(ev) {
		this.deltaValue(-this.props.field.step || -1, ev.ctrlKey);
	}
		
	onChange (ev, forceFormat = false) {
		forceFormat = (forceFormat===true);
		let props = this.props;
		let field = props.field;
		if(forceFormat) {
			this.setState({tmpVal: undefined});
		} else {
			this.setState({tmpVal: ev.target.value});
		}
		let val = parseFloat(ev.target.value);
		if(isNaN(val) && !forceFormat) {
			return;
		}
		if(!val) {
			val = 0;
		}
		props.onChange(PropsFieldWrapper.surrogateChnageEvent(this.cropVal(val)));
	}

	onDoubleClick(ev) {
		ev.target.select();
	}

	onMouseDown(ev) {
		draggingElement = this;
		lastY = ev.clientY;
	}

	onKeyDown(ev) {
		let step = this.props.field.step || 1;
		switch(ev.keyCode) {
			case 38:
			this.deltaValue(step, ev.ctrlKey);
			sp(ev);
			break;
			case 40:
			this.deltaValue(-step, ev.ctrlKey);
			sp(ev);
			break;
		}
	}

	deltaValue(d, x10) {
		if(x10) {
			d *= 10;
		}
		let step = this.props.field.step || 1;
		let val = this.state.value;
		let croppedVal = this.cropVal(val + d);
		croppedVal = Math.round(croppedVal / step) * step;
		d = croppedVal - val;
		
		let e = PropsFieldWrapper.surrogateChnageEvent(croppedVal);
		this.setState({tmpVal:undefined, value: croppedVal});
		this.props.onChange(e, true, d);
	}

	cropVal(val) {
		if(this.props.field.hasOwnProperty('min')) {
			val = Math.max(val, this.props.field.min);
		}
		if(this.props.field.hasOwnProperty('max')) {
			val = Math.min(val, this.props.field.max);
		}
		return val;
	}

	static getDerivedStateFromProps(props, state) {
		if(!state) {
			state = {};
		}
		state.value = props.value;
		if(state.o !== editor.selection[0]) {
			delete state.tmpVal;
		}
		state.o = editor.selection[0];
		return state;
	}

	render() {
		let props = this.props;
		let step = props.field.step || 1;
		let val = (typeof this.state.tmpVal !== 'undefined') ? this.state.tmpVal : this.state.value;
		return R.span(numberEditorProps,
			R.input({
				onChange: this.onChange,
				disabled:props.disabled,
				value: val,
				onDoubleClick: this.onDoubleClick,
				onKeyDown:this.onKeyDown
			}),
			this.btnUp,
			this.btnDown
		);
	}
};

export default NumberEditor;