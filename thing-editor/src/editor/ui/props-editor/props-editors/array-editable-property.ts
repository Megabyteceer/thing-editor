import { Component, ComponentChild, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";

const arrayProps = { className: 'array-prop' };
const arrayItemProps = { className: 'array-prop-item' };

interface ArrayEditablePropertyState {
	toggled?: boolean;
	filter?: string;
}

export default class ArrayEditableProperty extends Component<EditablePropertyEditorProps, ArrayEditablePropertyState> {

	render(): ComponentChild {
		const field = this.props.field;
		let arrayValue = this.props.value;
		if(arrayValue && !Array.isArray(arrayValue)) {
			arrayValue = [arrayValue];
		}
		return R.div(
			arrayProps,
			arrayValue.map((value: any, i: number) => {
				return R.div(arrayItemProps, h(field.renderer, {
					value,
					onChange: (itemValue: any) => {
						if(itemValue && itemValue.target) {
							itemValue = itemValue.target.value;
						}
						const newArray = arrayValue.slice();
						newArray[i] = itemValue;
						this.props.onChange(newArray);
					},
					onBlur: this.props.onBlur,
					field,
					disabled: this.props.disabled
				}), R.btn('×', () => {
					const newArray = arrayValue.slice();
					newArray.splice(i, 1);
					this.props.onChange(newArray);
				}, 'remove item', 'array-prop-item-remove-btn'));
			}),
			R.btn('+', () => {
				const newArray = arrayValue.slice();
				newArray.push(field.defaultArrayItemValue || PropsEditor.getDefaultForType(field));
				this.props.onChange(newArray);
			}, 'Add item', 'add-item-button')
		);
	}
}