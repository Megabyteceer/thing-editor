import { ComponentChild } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";
import game from "thing-editor/src/engine/game";

const soundEditorProps = { className: 'asset-editor' };

const SoundEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return R.div(soundEditorProps,
		R.btn(props.value || '. . .', () => {
			game.editor.chooseSound('Select "' + props.field.name + '" sound', props.value).then((selectedSound) => {
				if(selectedSound) {
					props.onChange(selectedSound);
					game.editor.history.scheduleHistorySave();
				}
			});
		}, props.value, 'choose-asset-button'),
		props.value ? R.btn(R.icon('asset-sound'), () => {
			game.editor.previewSound(props.value);
		}, 'Play', 'tool-button') : undefined,
		props.value ? R.btn(R.icon('reject'), (ev: PointerEvent) => {
			showContextMenu([
				{
					name: R.fragment(R.icon('reject'), "Clear '" + props.field.name + "'"),
					onClick: () => {
						props.onChange(null);
					}
				},
				{
					name: "Cancel",
					onClick: () => { } // eslint-disable-line @typescript-eslint/no-empty-function
				}
			], ev);
		}, 'Clear', 'tool-button') : undefined
	);
};

SoundEditor.parser = (val: string) => {
	return val || null;
};

export default SoundEditor;