import { ComponentChild, h } from "preact";
import LanguageView from "thing-editor/src/editor/ui/language-view";
import SelectEditor from "thing-editor/src/editor/ui/props-editor/props-editors/select-editor";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";

const L18nEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return h(SelectEditor, {
		value: props.value,
		select: LanguageView.selectableList,
		onChange: (val: string) => {
			props.onChange(val);
		},
		field: props.field
	});
};

L18nEditor.parser = (val: string) => {
	return val || null;
};

export default L18nEditor;