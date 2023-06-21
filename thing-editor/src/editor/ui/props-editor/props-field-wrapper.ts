import { Container } from "pixi.js";
import { ClassAttributes, Component, ComponentChild, h } from "preact";
import { KeyedObject } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import { EditablePropertyDesc, EditablePropertyType } from "thing-editor/src/editor/props-editor/editable";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import ArrayEditableProperty from "thing-editor/src/editor/ui/props-editor/props-editors/array-editable-property";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

const wrapperProps = { className: 'props-wrapper' };
const defaultValueProps = {
	className: 'default-value selectable-text',
	title: 'Ctrl+click to copy default value',
	onMouseDown: copyTextByClick
};

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
	defaultValue: any;
}

const CAN_COPY_VALUES_OF_TYPE: EditablePropertyType[] = [
	'data-path',
	'callback',
	'color',
	'string',
	'prefab',
	'number'
]

const onContextMenu = (fieldEditor: PropsFieldWrapper, value: any, ev: PointerEvent) => {
	const field: EditablePropertyDesc = fieldEditor.props.field;
	const defaultValue: any = fieldEditor.props.defaultValue;

	showContextMenu([
		{
			name: R.fragment(R.icon('copy'), "Copy value"),
			onClick: () => { game.editor.copyToClipboard(value) },
			disabled: () => CAN_COPY_VALUES_OF_TYPE.indexOf(field.type) < 0
		},
		{
			name: R.fragment(R.icon('paste'), "Paste value"),
			onClick: () => {
				navigator.clipboard.readText().then(text => {
					let val: any;
					if(field.type === 'color' || field.type === 'number') {
						val = parseFloat(text) || 0;
					} else {
						val = text;
					}
					game.editor.onSelectedPropsChange(field, val);
				});
			},
			disabled: () => CAN_COPY_VALUES_OF_TYPE.indexOf(field.type) < 0
		},
		{
			name: R.fragment(R.icon('copy'), "Copy property name"),
			onClick: () => { game.editor.copyToClipboard(field.name) }
		},
		{
			name: "Why disabled?..",
			onClick: () => { game.editor.ui.modal.showInfo(R.fragment(R.b(null, field.name), R.br(), game.editor.ui.propsEditor.disableReasons[field.name]), "Property is disabled.") },
			disabled: () => !game.editor.ui.propsEditor.disableReasons[field.name]
		},
		null,
		{
			name: "Go to definition >>",
			onClick: () => {
				game.editor.editSource(field.__src);
			}
		},
		null,
		{
			name: R.fragment(R.icon('reject'), 'Reset "' + field.name + '" value to default: ', R.span(defaultValueProps, defaultValue)),
			onClick: () => {
				game.editor.onSelectedPropsChange(field, defaultValue);
			},
			disabled: () => defaultValue === undefined || value === defaultValue || !game.editor.ui.propsEditor.editableProps[field.name]
		},

	], ev)
};

export default class PropsFieldWrapper extends Component<PropsFieldWrapperProps> {

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
		if(val && val.target) {
			val = val.target.value;
		}
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

	onAutoSelect(_selectPath: string) { // eslint-disable-line @typescript-eslint/no-unused-vars
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
		if(!node) {
			return R.fragment();
		}
		let value = (node as KeyedObject)[field.name];

		let disabled = !this.props.propsEditor.editableProps[field.name];

		let className = field.important ? 'props-field props-field-important props-field-' + field.type : 'props-field props-field-' + field.type;

		if(field.notSerializable) {
			if(value == field.default || !field.hasOwnProperty('default')) {
				className += ' props-wrapper-default-value';
			}
		} else {
			if(value == this.props.defaultValue) {
				className += ' props-wrapper-default-value';
			}
		}

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
			'data-help': field.helpUrl,
			onContextMenu: (ev: PointerEvent) => {
				if((ev.target as HTMLElement).tagName !== 'button') {
					onContextMenu(this, value, ev);
				}
			}
		},
			R.div({
				className: field.name.startsWith('__') ? 'props-label props-label-helper selectable-text' : 'props-label selectable-text',
				title: 'Double click - go to definition, Ctrl+click to copy field`s name',
				onMouseDown: copyTextByClick,
				onDblClick: () => {
					game.editor.editSource(field.__src);
				}
			}, tip, field.name),
			R.div(wrapperProps,
				field.arrayProperty ?
					h(ArrayEditableProperty, {
						ref: this.editorRef,
						value,
						onChange: this.onChange as any,
						onBlur: this._onBlur,
						field,
						disabled
					}) :
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
