import R from "thing-editor/src/editor/preact-fabrics";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";

const StringEditor = (props: EditablePropertyEditorProps) => {
	const elementProps = { onChange: props.onChange, onBlur: props.onBlur, disabled: props.disabled, title: props.value, value: props.value || '' };
	if(props.field.multiline) {
		return R.textarea(elementProps);
	}
	return R.input(elementProps);
};

export default StringEditor;