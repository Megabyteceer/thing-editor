import { ComponentChild } from "preact";
import fs, { AssetType } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import { EditablePropertyEditorProps } from "thing-editor/src/editor/ui/props-editor/props-field-wrapper";
import game from "thing-editor/src/engine/game";

const prefabEditorProps = { className: 'asset-editor' };

const PrefabPropertyEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return R.div(prefabEditorProps,
		R.btn(props.value || '. . .', () => {
			game.editor.choosePrefab('Select "' + props.field.name + '" prefab', props.value, props.field.filterAssets).then((selectedImage) => {
				if(selectedImage) {
					props.onChange(selectedImage);
					game.editor.history.scheduleHistorySave();
				}
			});
		}, props.value, (!props.value || fs.getFileByAssetName(props.value, AssetType.PREFAB)) ? 'choose-asset-button' : 'choose-asset-button danger'),
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

PrefabPropertyEditor.parser = (val: string) => {
	return val || null;
};

export default PrefabPropertyEditor;