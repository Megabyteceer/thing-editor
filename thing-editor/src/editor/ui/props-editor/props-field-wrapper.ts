import type { Container } from 'pixi.js';
import type { ClassAttributes, ComponentChild } from 'preact';
import { Component, h } from 'preact';

import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc, EditablePropertyType } from 'thing-editor/src/editor/props-editor/editable';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import PropsEditor from 'thing-editor/src/editor/ui/props-editor/props-editor';
import ArrayEditableProperty from 'thing-editor/src/editor/ui/props-editor/props-editors/array-editable-property';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

const wrapperProps = { className: 'props-wrapper' };
const defaultValueProps = {
	className: 'default-value selectable-text',
	title: 'Ctrl+click to copy default value',
	onMouseDown: copyTextByClick
};

const nameValueProps = {
	className: 'selectable-text context-menu-item-hotkey'
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
	onChange: (field: EditablePropertyDesc, val: any, isDelta?: boolean) => void;
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
];

const onContextMenu = (fieldEditor: PropsFieldWrapper, value: any, ev: PointerEvent) => {
	const field: EditablePropertyDesc = fieldEditor.props.field;
	const defaultValue: any = fieldEditor.props.defaultValue;

	let clickedArrayItemIndex = -1;

	if (field.arrayProperty) {
		const items = Array.from((fieldEditor.base as HTMLDivElement)!.querySelectorAll('.array-prop-item'));
		clickedArrayItemIndex = items.findIndex(i => i.contains(ev!.target as HTMLDivElement) || i === ev!.target);
	}

	let clickedValue = value;
	if (field.arrayProperty) {
		clickedValue = value && value.length && value.join(',');
		const items = Array.from((fieldEditor.base as HTMLDivElement)!.querySelectorAll('.array-prop-item'));

		let i = items.findIndex(i => i.contains(ev!.target as HTMLDivElement) || i === ev!.target);
		if (i >= 0) {
			clickedValue = value[i];
		}
	}

	const contextMenu = [
		{
			name: R.fragment(R.icon('copy'), 'Copy value', R.span(nameValueProps, clickedValue)),
			onClick: () => {
				game.editor.copyToClipboard(clickedValue);
			},
			disabled: () => CAN_COPY_VALUES_OF_TYPE.indexOf(field.type) < 0
		},
		{
			name: R.fragment(R.icon('paste'), 'Paste value'),
			onClick: () => {
				navigator.clipboard.readText().then(text => {
					let val: any;

					let a = text.split(',');
					if (field.type === 'color' || field.type === 'number') {
						a = a.map(v => parseFloat(v) || 0) as any;
					}
					if (field.arrayProperty) {
						if (clickedArrayItemIndex < 0) {
							val = a;
						} else {
							val = ((game.editor.selection[0] as any as KeyedMap<any[]>)[field.name] || []).slice();
							val[clickedArrayItemIndex] = a[0];
						}
					} else {
						val = a[0];
					}
					game.editor.editProperty(field, val);
				});
			},
			disabled: () => CAN_COPY_VALUES_OF_TYPE.indexOf(field.type) < 0
		},
		{
			name: R.fragment(R.icon('copy'), 'Copy property name', R.span(nameValueProps, field.name)),
			onClick: () => { game.editor.copyToClipboard(field.name); }
		},
		{
			name: 'Why disabled?..',
			onClick: () => { game.editor.ui.modal.showInfo(R.fragment(R.b(null, field.name), R.br(), game.editor.ui.propsEditor.disableReasons[field.name]), 'Property is disabled.'); },
			disabled: () => !game.editor.ui.propsEditor.disableReasons[field.name]
		},
		(clickedArrayItemIndex >= 0) ? {
			name: '➦ Insert item upper',
			onClick: () => {
				const val = ((game.editor.selection[0] as any as KeyedMap<any[]>)[field.name] || []).slice();
				val.splice(clickedArrayItemIndex, 0, field.defaultArrayItemValue || PropsEditor.getDefaultForType(field));
				game.editor.editProperty(field, val);
			}

		} : null,
		(clickedArrayItemIndex >= 0) ? {
			name: '➥ Insert item lower',
			onClick: () => {
				const val = ((game.editor.selection[0] as any as KeyedMap<any[]>)[field.name] || []).slice();
				val.splice(clickedArrayItemIndex + 1, 0, field.defaultArrayItemValue || PropsEditor.getDefaultForType(field));
				game.editor.editProperty(field, val);
			}

		} : null,
		(clickedArrayItemIndex > 0) ? {
			name: '↑ Move item up',
			onClick: () => {
				const val = ((game.editor.selection[0] as any as KeyedMap<any[]>)[field.name] || []).slice();
				let item = val[clickedArrayItemIndex];
				val.splice(clickedArrayItemIndex, 1);
				val.splice(clickedArrayItemIndex - 1, 0, item);
				game.editor.editProperty(field, val);
			}

		} : null,
		(clickedArrayItemIndex >= 0) ? {
			name: '↓ Move item down',
			onClick: () => {
				const val = ((game.editor.selection[0] as any as KeyedMap<any[]>)[field.name] || []).slice();
				if (clickedArrayItemIndex < (val.length - 1)) {
					let item = val[clickedArrayItemIndex];
					val.splice(clickedArrayItemIndex, 1);
					val.splice(clickedArrayItemIndex + 1, 0, item);
					game.editor.editProperty(field, val);
				}
			}

		} : null,
		null,
		{
			name: 'Go to property definition >>',
			onClick: () => {
				game.editor.editSource(field.__src);
			}
		},
		null,
		{
			name: R.fragment(R.icon('reject'), 'Reset "' + field.name + '" value to default: ', R.span(defaultValueProps, defaultValue)),
			onClick: () => {
				game.editor.editProperty(field, defaultValue);
			},
			disabled: () => defaultValue === undefined || value === defaultValue || !game.editor.ui.propsEditor.editableProps[field.name]
		},

	];

	if (field.renderer.contextMenuInjection) {
		field.renderer.contextMenuInjection(contextMenu, field, clickedValue, value);
	}

	showContextMenu(contextMenu, ev);
};

export default class PropsFieldWrapper extends Component<PropsFieldWrapperProps> {

	propertyEditor: ComponentChild;

	ownerContainer!: Container;

	constructor(props: PropsFieldWrapperProps) {
		super(props);
		this.state = {};
		this.onChange = this.onChange.bind(this);
		this.editorRef = this.editorRef.bind(this);
		this._onBlur = this._onBlur.bind(this);
		props.propsEditor.refs.set(this.props.field.name, this);
	}

	_onBlur() {
		if (this.props.field.onBlur) {
			this.props.field.onBlur();
		}
	}

	componentWillUnmount(): void {
		this.props.propsEditor.refs.delete(this.props.field.name);
	}

	componentWillReceiveProps() {
		if (this.ownerContainer !== game.editor.selection[0]) {
			this.ownerContainer = game.editor.selection[0];
			this.setState({ value: undefined });
		}
	}

	onChange(val: any, isDelta = false, deltaVal?: number) {
		if (val && val.target) {
			val = val.target.value;
		}
		assert(!(val instanceof Event), 'Pure value expected. Event received.');
		assert((!isDelta) || (typeof isDelta === 'boolean'), 'Delta expected to be boolean');
		let field = this.props.field;

		if (field.hasOwnProperty('parser')) {
			val = (field.parser as (val: any) => any)(val);
		}

		if (field.renderer.hasOwnProperty('parser')) {
			val = (field.renderer.parser as (val: any) => any)(val);
		}

		if (field.hasOwnProperty('min')) {
			if (Array.isArray(val)) {
				val = val.map(v => Math.max(field.min!, v));
			} else {
				val = Math.max(field.min!, val);
			}
		}
		if (field.hasOwnProperty('max')) {
			if (Array.isArray(val)) {
				val = val.map(v => Math.min(field.max!, v));
			} else {
				val = Math.min(field.max!, val);
			}
		}
		if ((this.state as any).value !== val) {
			if (isDelta) {
				this.props.onChange(field, deltaVal, true);
			} else {
				this.props.onChange(field, val);
			}

			this.setState({ value: val });
		}
	}

	onAutoSelect(selectPath: string[]) {
		if (this.propertyEditor && (this.propertyEditor as any).onAutoSelect) {
			(this.propertyEditor as any).onAutoSelect(selectPath);
		}
	}

	editorRef(ref: ComponentChild | null) {
		this.propertyEditor = ref;
	}

	render() {
		let field = this.props.field;
		let node: Container = game.editor.selection[0];
		if (!node) {
			return R.fragment();
		}
		let value = (node as KeyedObject)[field.name];

		let disabled = !this.props.propsEditor.editableProps[field.name];

		let className = field.important ? 'props-field props-field-important props-field-' + field.type : 'props-field props-field-' + field.type;

		if (field.notSerializable) {
			if (value == field.default || !field.hasOwnProperty('default')) {
				className += ' props-wrapper-default-value';
			}
		} else {
			if (value == this.props.defaultValue) {
				className += ' props-wrapper-default-value';
			}
		}

		if (field.separator) {
			className += ' props-wrapper-separator';
		}

		let tip;
		if (field.hasOwnProperty('tip')) {
			tip = ((typeof field.tip === 'function') ? field.tip() : field.tip);
			if (tip) {
				tip = R.tip(field.name,
					'Field "' + field.name + '" description:',
					tip
				);
			}
		}

		(this.state as any).value = value;

		return R.div({
			className, id: 'property-editor-' + field.name.replace('.', '_'),
			title: field.name,
			'data-help': field.helpUrl,
			onContextMenu: (ev: PointerEvent) => {
				if ((ev.target as HTMLElement).tagName !== 'button') {
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

