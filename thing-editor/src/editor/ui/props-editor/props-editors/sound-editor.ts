import { ComponentChild } from "preact";
import { AssetType } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import { assetTypesIcons } from "thing-editor/src/editor/ui/assets-view/assets-view";
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
				}
			});
		}, props.value, 'choose-asset-button'),
		props.value ? R.btn(assetTypesIcons.get(AssetType.SOUND), () => {
			game.editor.previewSound(props.value);
		}, 'Play', 'tool-button') : undefined,
		props.value ? R.btn(R.icon('reject'), (ev: PointerEvent) => {
			showContextMenu([
				{
					name: R.fragment(R.icon('reject'), 'Clear"' + props.field.name + '" value'),
					onClick: () => {
						props.onChange(null);
					}
				},
				{
					name: "Cancel",
					onClick: () => { }
				}
			], ev);
		}, 'Clear', 'tool-button') : undefined
	);


	/*




sound select type

крестик очистки.

кнопка плей текущего звука.

приклике по полю - выбор звука на замену.

в choose - опцию фильтрНейм для сохранения восстановления текста фильтра.
для звуков и префабов восстанавливать фильтр если задан фильтрНейм

	*/
};

SoundEditor.parser = (val: string) => {
	return val || null;
};

export default SoundEditor;