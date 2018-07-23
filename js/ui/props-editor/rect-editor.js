import NumberEditor from "./number-editor.js";
import BooleanEditor from "./boolean-editor.js";
import PropsFieldWrapper from "./props-field-wrapper.js";

const rectEditorProps = {className:'rect-editor'};

const sizeFieldProp = {min:0, step:1};
const posFieldProp = {step:1};

const propLabelProps = {className:'rect-prop-label'};
const xLabel = R.div(propLabelProps, 'x:');
const yLabel = R.div(propLabelProps, 'y:');
const wLabel = R.div(propLabelProps, 'w:');
const hLabel = R.div(propLabelProps, 'h:');

export default class RectangleEditor extends React.Component {

	constructor(props) {
		super(props);
		this.onXChange = this.onXChange.bind(this);
		this.onYChange = this.onYChange.bind(this);
		this.onWChange = this.onWChange.bind(this);
		this.onHChange = this.onHChange.bind(this);
		this.onEnabledChange = this.onEnabledChange.bind(this);
	}

	onXChange(ev) {
		this.changeRectProperty(ev, 'x');
	}

	onYChange(ev) {
		this.changeRectProperty(ev, 'y');
	}

	onWChange(ev) {
		this.changeRectProperty(ev, 'w');
	}

	onHChange(ev) {
		this.changeRectProperty(ev, 'h');
	}

	changeRectProperty(ev, name) {
		let val = ev.target.value;
		if(this.props.value[name] !== val) {
			this.props.value[name] = val;
			this.forceUpdate();
			editor.sceneModified();
		}
	}

	onEnabledChange() {
		let val;

		let extData = __getNodeExtendData(editor.selection[0]);

		if(this.props.value) {
			extData['removedRect'+this.props.field.name] = this.props.value;
			this.props.value.removed = true;
			editor.overlay.drawRect(this.props, editor.selection[0]);
			val = null;
		} else {
			val = extData['removedRect'+this.props.field.name] || {x:0,y:0,w:100,h:50};
			delete val.removed;
		}
		let e = PropsFieldWrapper.surrogateChnageEvent(val);
		this.props.onChange(e);
	}

	render() {
		if(editor.selection.length > 1) {
			return R.span(null, 'Rectangle editor doe not support multily selection.');
		}
		var r = this.props.value;
		
		var body;
		if(r) {
			editor.overlay.drawRect(this.props, editor.selection[0]);
			body = R.div(null,
				xLabel,
				React.createElement(NumberEditor,{field:posFieldProp, onChange: this.onXChange, value:r.x}),
				yLabel,
				React.createElement(NumberEditor,{field:posFieldProp, onChange: this.onYChange, value:r.y}),
				wLabel,
				React.createElement(NumberEditor,{field:sizeFieldProp, onChange: this.onWChange, value:r.w}),
				hLabel,
				React.createElement(NumberEditor,{field:sizeFieldProp, onChange: this.onHChange, value:r.h})
			);
		}
		
		return R.div(rectEditorProps,
			React.createElement(BooleanEditor, {onChange: this.onEnabledChange, value:r !== null}),
			body
		);
	}
}