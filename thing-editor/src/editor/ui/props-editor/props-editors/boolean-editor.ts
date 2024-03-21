import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import game from 'thing-editor/src/engine/game';

const BooleanEditor = (props: EditablePropertyEditorProps) => {
	return R.input({
		onChange: (ev: InputEvent) => {
			props.onChange((ev.target as HTMLInputElement).checked);
			game.editor.history.scheduleHistorySave();
		}, disabled: props.disabled,
		className: 'checkbox clickable',
		type: 'checkbox',
		checked: props.value || false
	});
};

export default BooleanEditor;
