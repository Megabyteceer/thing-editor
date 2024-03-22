import type { Container } from 'pixi.js';
import type { ComponentChild } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import StatusBar from 'thing-editor/src/editor/ui/status-bar';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const numberEditorProps = { className: 'number-input' };

let draggingElement: NumberEditor | undefined;
let preventClickBecauseOfDragging = false;
let downedArrow: HTMLElement | null;

function clearDownedArrayRef() {
	downedArrow = null;
}
function onMouseUp() {
	if (draggingElement) {
		document.exitPointerLock();
		draggingElement = undefined;
	}
	window.setTimeout(clearDownedArrayRef, 1);
}

document.addEventListener('mouseup', onMouseUp);

document.addEventListener('mousemove', (ev) => {
	if (!draggingElement) return;

	StatusBar.addStatus('Hold Ctrl - to fast scroll.', 'number-editor');

	let d = -ev.movementY;
	if (d !== 0) {
		preventClickBecauseOfDragging = true;
		d = d * (draggingElement.step);
		draggingElement.deltaValue(d, ev.ctrlKey);
	}
});

interface NumberEditorProps extends Omit<EditablePropertyEditorProps, 'field'> {
	field?: EditablePropertyDesc;
	step?: number;
	max?: number;
	min?: number;
}

interface NumberEditorState {
	value?: number;
	o?: Container;
}

const onArrowOver = () => {
	StatusBar.addStatus('drag arrow up and down - to delta value', 'number-editor');

};
const onArrowOut = () => {
	StatusBar.removeStatus('number-editor');
};

class NumberEditor extends Component<NumberEditorProps, NumberEditorState> {

	btnUp: ComponentChild;
	btnDown: ComponentChild;
	tmpVal?: number;
	rawVal?: string;

	constructor(props: NumberEditorProps) {
		super(props);
		this.state = { value: props.value };
		this.onChange = this.onChange.bind(this);
		this.onInput = this.onInput.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onUpClick = this.onUpClick.bind(this);
		this.onDownClick = this.onDownClick.bind(this);
		this.onBlur = this.onBlur.bind(this);
		this.btnUp = R.span({ className: 'number-input-btn number-input-btn-up', onMouseUp: this.onUpClick, onMouseDown: this.onMouseDown, onMouseOver: onArrowOver, onMouseOut: onArrowOut }, '▲');
		this.btnDown = R.span({ className: 'number-input-btn number-input-btn-down', onMouseUp: this.onDownClick, onMouseDown: this.onMouseDown, onMouseOver: onArrowOver, onMouseOut: onArrowOut }, '▼');
	}

	componentWillUnmount() {
		onMouseUp();
	}

	onBlur() {
		if (this.state) {
			delete this.tmpVal;
			delete this.rawVal;
			this.forceUpdate();
		}
	}

	get step() {
		if (this.props.field) {
			return this.props.field.step || 1;
		}
		return this.props.step || 1;
	}

	get max(): number {
		if (this.props.field && !isNaN(this.props.field.max as number)) {
			return this.props.field.max as number;
		}
		return !isNaN(this.props.max as number) ? this.props.max as number : Number.POSITIVE_INFINITY;
	}

	get min(): number {
		if (this.props.field && !isNaN(this.props.field.min as number)) {
			return this.props.field.min as number;
		}
		return !isNaN(this.props.min as number) ? this.props.min as number : Number.NEGATIVE_INFINITY;
	}

	onUpClick(ev: PointerEvent) {
		if (!preventClickBecauseOfDragging && downedArrow === ev.target) {
			this.deltaValue(this.step, ev.ctrlKey);
		}
	}

	onDownClick(ev: PointerEvent) {
		if (!preventClickBecauseOfDragging && downedArrow === ev.target) {
			this.deltaValue(-this.step, ev.ctrlKey);
		}
	}

	onInput(ev: InputEvent) {
		const rawValue = (ev.target as HTMLInputElement).value;
		this.onChange(ev, true);
		this.rawVal = rawValue;

	}

	onChange(ev: InputEvent, forceFormat = false) {
		forceFormat = (forceFormat === true);
		let props = this.props;
		if (forceFormat) {
			this.tmpVal = undefined;
		} else {
			this.tmpVal = parseFloat((ev.target as HTMLInputElement).value);
		}

		let targetValue = (ev.target as HTMLInputElement).value;
		try {
			targetValue = eval((ev.target as HTMLInputElement).value);
		} catch (_er) { }

		let val = (props.field && props.field.basis) ? parseInt((ev.target as HTMLInputElement).value, props.field.basis) : parseFloat(targetValue);
		if (isNaN(val) && !forceFormat) {
			return;
		}
		if (!val) {
			val = 0;
		}
		props.onChange(this.cropVal(val));
	}


	onMouseDown(ev: PointerEvent) {
		(ev.target as HTMLInputElement).requestPointerLock();
		draggingElement = this;
		downedArrow = ev.target as HTMLInputElement;
		preventClickBecauseOfDragging = false;
	}

	onKeyDown(ev: KeyboardEvent) {
		switch (ev.keyCode) {
			case 38:
				this.deltaValue(this.step, ev.ctrlKey);
				sp(ev);
				break;
			case 40:
				this.deltaValue(-this.step, ev.ctrlKey);
				sp(ev);
				break;
		}
	}

	deltaValue(d: number, x10 = false) {
		if (x10) {
			d *= 10;
		}
		let step = this.step;
		let val = this.state.value as number;
		let croppedVal = this.cropVal(val + d);
		croppedVal = Math.round(croppedVal / step) * step;
		d = croppedVal - val;
		this.tmpVal = undefined;
		this.rawVal = undefined;
		this.setState({ value: croppedVal });
		this.props.onChange(croppedVal, true, d);
	}

	cropVal(val: number) {
		val = Math.max(val, this.min);
		val = Math.min(val, this.max);
		return val;
	}

	componentWillReceiveProps(props: NumberEditorProps, state: NumberEditorState) {
		if (!state) {
			state = {};
		}
		state.value = props.value;
		if (state.o !== game.editor.selection[0]) {
			this.tmpVal = undefined;
		}
		this.setState({ o: game.editor.selection[0], value: props.value });

	}

	render() {
		let props = this.props;
		let val: number = ((typeof this.tmpVal !== 'undefined') ? this.tmpVal : this.state.value) as number;
		if (props.field && props.field.notSerializable && (typeof val === 'undefined')) {
			val = props.field.default as number;
		}
		return R.span(numberEditorProps,
			R.input({
				className: 'number-input',
				suspendOnChangeWarning: true,
				onBlur: this.onBlur,
				onChange: this.onChange,
				onInput: this.onInput,
				disabled: props.disabled,
				type: 'text',
				value: this.rawVal || ((props.field && props.field.basis) ? val.toString(props.field.basis) : val),
				onKeyDown: this.onKeyDown
			}),
			props.disabled ? undefined : this.btnUp,
			props.disabled ? undefined : this.btnDown
		);
	}
}

export default NumberEditor;

export type { NumberEditorProps };

