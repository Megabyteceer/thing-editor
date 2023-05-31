import { Container } from "pixi.js";
import { ClassAttributes, Component, ComponentChild, h } from "preact";
import { KeyedObject } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import { EditablePropertyDesc } from "thing-editor/src/editor/props-editor/editable";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

const wrapperProps = { className: 'props-wrapper' };

interface EditablePropertyEditorProps extends ClassAttributes<PropsFieldWrapper> {
	field: EditablePropertyDesc;
	value: any;
	disabled?: boolean;
	onBlur?: () => void;
	onChange: (val: any, isDelta?: boolean, deltaVal?: number) => void;
}

interface PropsFieldWrapperProps extends ClassAttributes<PropsFieldWrapper> {
	field: EditablePropertyDesc;
	onChange: (field: EditablePropertyDesc, val: any, isDelta?: boolean) => void
	propsEditor: PropsEditor;
}

interface PropsFieldWrapperState {

}


export default class PropsFieldWrapper extends Component<PropsFieldWrapperProps, PropsFieldWrapperState> {

	propertyEditor: ComponentChild;

	constructor(props: PropsFieldWrapperProps) {
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
		this.editorRef = this.editorRef.bind(this);
		this._onBlur = this._onBlur.bind(this);
		props.propsEditor.refs.set(this.props.field.name, this);
	}

	_onBlur() {
		if(this.props.field.onBlur) {
			this.props.field.onBlur();
		}
	}

	componentWillUnmount(): void {
		this.props.propsEditor.refs.delete(this.props.field.name);
	}

	onChange(val: any, isDelta = false, deltaVal?: number) {
		assert(!(val instanceof Event), "Pure value expected. Event received.");
		assert((!isDelta) || (typeof isDelta === 'boolean'), "Delta expected to be boolean");
		let field = this.props.field;

		if(field.hasOwnProperty('parser')) {
			val = (field.parser as (val: any) => any)(val);
		}

		if(field.renderer.hasOwnProperty('parser')) {
			val = (field.renderer.parser as (val: any) => any)(val);
		}

		if(field.hasOwnProperty('min')) {
			val = Math.max(field.min as number, val);
		}
		if(field.hasOwnProperty('max')) {
			val = Math.min(field.max as number, val);
		}
		if(isDelta) {
			this.props.onChange(field, deltaVal, true);
		} else {
			this.props.onChange(field, val);
		}

		this.setState({ value: val });
	}

	onAutoSelect(_selectPath: string) {
		//TODO select by __view property
		/*
		if(this.refs.fieldRef && this.refs.fieldRef.onAutoSelect) {
			this.refs.fieldRef.onAutoSelect(selectPath);
		}*/
	}

	editorRef(ref: ComponentChild | null) {
		this.propertyEditor = ref;
	}

	render() {
		let field = this.props.field;
		let node: Container = game.editor.selection[0];
		let value = (node as KeyedObject)[field.name];

		let disabled = field.disabled && field.disabled(node);

		let className = field.important ? 'props-field props-field-important' : 'props-field';

		let tip;
		if(field.hasOwnProperty('tip')) {
			tip = ((typeof field.tip === 'function') ? field.tip() : field.tip);
			if(tip) {
				tip = R.tip(field.name,
					'Field "' + field.name + '" description:',
					tip
				);
			}
		}

		return R.div({
			className, id: 'property-editor-' + field.name.replace('.', '_'),
			title: field.name,
			'data-help': field.helpUrl
		},
			tip,
			R.div({
				className: field.name.startsWith('__') ? 'props-label props-label-helper selectable-text' : 'props-label selectable-text',
				title: 'Double click - go to definition, Ctrl+click to copy field`s name',
				onMouseDown: copyTextByClick,
				onDblClick: () => {
					game.editor.editSource(field.__src);
				}
			}, field.name),
			R.div(wrapperProps,
				h(field.renderer, {
					ref: this.editorRef,
					value,
					onChange: this.onChange as any,
					onBlur: this._onBlur,
					field,
					disabled
				})
			));
	}
}

export type { EditablePropertyEditorProps };
