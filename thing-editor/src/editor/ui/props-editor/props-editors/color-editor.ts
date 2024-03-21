import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import game from 'thing-editor/src/engine/game';

const ColorEditor = (props: EditablePropertyEditorProps) => {
	let val = props.value || 0;

	return R.input({
		onInput: (ev: InputEvent) => {
			props.onChange(parseInt((ev.target as HTMLInputElement).value.replace('#', ''), 16));
		},
		onChange: () => {
			game.editor.history.scheduleHistorySave();
		},
		disabled: props.disabled,
		className: 'clickable color-input',
		type: 'color',
		value: '#' + val.toString(16).padStart(6, '0')
	});
};

export default ColorEditor;
