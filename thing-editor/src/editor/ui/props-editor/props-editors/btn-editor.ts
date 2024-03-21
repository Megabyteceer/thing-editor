import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import game from 'thing-editor/src/engine/game';

const BtnProperty = (props: EditablePropertyEditorProps) => {
	const field = props.field;

	return R.btn(field.name, () => {
		game.editor.selection.some(field.onClick!);
	}, field.title, field.className, field.hotkey);
};

export default BtnProperty;
