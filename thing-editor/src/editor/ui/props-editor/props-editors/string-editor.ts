import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';

const StringEditor = (props: EditablePropertyEditorProps) => {
	const elementProps = {
		onInput: (ev: InputEvent) => {
			props.onChange((ev.target as HTMLInputElement).value);
		}, onBlur: props.onBlur, disabled: props.disabled, title: props.value, value: props.value || ''
	};
	if (props.field.multiline) {
		return R.textarea(elementProps);
	}
	return R.input(elementProps);
};

StringEditor.parser = (val: string) => {
	return val || null;
};

export default StringEditor;
