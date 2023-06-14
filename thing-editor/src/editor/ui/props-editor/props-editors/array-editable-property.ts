import { Component, ComponentChild, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";

const arrayProps = { className: 'array-prop' };
const arrayItemProps = { className: 'array-prop-item' };

interface ArrayEditablePropertyProps extends EditablePropertyEditorProps {


}

interface ArrayEditablePropertyState {
	toggled?: boolean;
	filter?: string;
}

export default class ArrayEditableProperty extends Component<ArrayEditablePropertyProps, ArrayEditablePropertyState> {

	render(): ComponentChild {
		const field = this.props.field;
		return R.div(
			arrayProps,
			this.props.value.map((value: any, i: number) => {
				return R.div(arrayItemProps, h(field.renderer, {
					value,
					onChange: (newValue) => {
						const newArray = this.props.value.slice();
						newArray[i] = newValue;
						this.props.onChange(newArray);
					},
					onBlur: this.props.onBlur,
					field,
					disabled: this.props.disabled
				}), R.btn('×', () => {
					const newArray = this.props.value.slice();
					newArray.splice(i, 1);
					this.props.onChange(newArray);
				}, 'remove item', 'array-prop-item-remove-btn'));
			}),
			R.btn('add item +', () => {
				const newArray = this.props.value.slice();
				newArray.push(field.defaultArrayItemValue || PropsEditor.getDefaultForType(field));
				this.props.onChange(newArray);
			})
		);
	}
}