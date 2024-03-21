import type { ComponentChild } from 'preact';
import { h } from 'preact';
import LanguageView from 'thing-editor/src/editor/ui/language-view';
import SelectEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';

const L10nEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return h(SelectEditor, {
		value: props.value,
		select: LanguageView.selectableList,
		onChange: (val: string) => {
			props.onChange(val);
		},
		field: props.field
	});
};

L10nEditor.parser = (val: string) => {
	return val || null;
};

export default L10nEditor;
