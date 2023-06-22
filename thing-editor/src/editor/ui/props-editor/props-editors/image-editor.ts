import { ComponentChild } from "preact";
import fs, { AssetType } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";
import game from "thing-editor/src/engine/game";

const imageEditorProps = { className: 'asset-editor' };

const ImageEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return R.div(imageEditorProps,
		R.btn(props.value || '. . .', () => {
			game.editor.chooseImage('Select "' + props.field.name + '" image', props.value).then((selectedImage) => {
				if(selectedImage) {
					props.onChange(selectedImage);
					game.editor.history.scheduleHistorySave();
				}
			});
		}, props.value, (!props.value || fs.getFileByAssetName(props.value, AssetType.IMAGE)) ? 'choose-asset-button' : 'choose-asset-button danger'),
		props.value ? R.imageIcon(fs.getFileByAssetName(props.value, AssetType.IMAGE)) : undefined,
		props.value ? R.btn(R.icon('reject'), (ev: PointerEvent) => {
			showContextMenu([
				{
					name: R.fragment(R.icon('reject'), "Clear '" + props.field.name + "'"),
					onClick: () => {
						props.onChange(props.field.canBeEmpty === false ? props.field.default : null);
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

ImageEditor.parser = (val: string) => {
	return val || null;
};

export default ImageEditor;