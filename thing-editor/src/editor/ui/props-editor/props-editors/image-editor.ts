import { ComponentChild } from "preact";
import fs, { AssetType } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";
import game from "thing-editor/src/engine/game";

const soundEditorProps = { className: 'asset-editor' };

const ImageEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return R.div(soundEditorProps,
		R.btn(props.value || '. . .', () => {
			game.editor.chooseImage('Select "' + props.field.name + '" image', props.value).then((selectedImage) => {
				if(selectedImage) {
					props.onChange(selectedImage);
				}
			});
		}, props.value, 'choose-asset-button'),
		props.value ? R.imageIcon(fs.getFileByAssetName(props.value, AssetType.IMAGE)) : undefined,
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
					onClick: () => { }
				}
			], ev);
		}, 'Clear', 'tool-button') : undefined
	);
};

ImageEditor.parser = (val: string) => {
	return val || null;
};

export default ImageEditor;