import type { ComponentChild } from 'preact';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';

const prefabEditorProps = { className: 'asset-editor' };

let assetNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefabs`s name',
	onMouseDown: copyTextByClick
};

const PrefabPropertyEditor = (props: EditablePropertyEditorProps): ComponentChild => {
	return R.div(prefabEditorProps,
		R.btn(props.value ? R.span(assetNameProps, props.value) : '. . .', () => {
			game.editor.choosePrefab('Select "' + props.field.name + '" prefab', props.value, props.field.filterAssets).then((selectedImage) => {
				if (selectedImage) {
					props.onChange(selectedImage);
					game.editor.history.scheduleHistorySave();
				}
			});
		}, props.value, (!props.value || fs.getFileByAssetName(props.value, AssetType.PREFAB)) ? 'choose-asset-button' : 'choose-asset-button danger'),
		props.value ? R.btn(R.icon('reject'), (ev: PointerEvent) => {
			showContextMenu([
				{
					name: R.fragment(R.icon('reject'), 'Clear \'' + props.field.name + '\''),
					onClick: () => {
						props.onChange(null);
					}
				},
				{
					name: 'Cancel',
					onClick: () => { } // eslint-disable-line @typescript-eslint/no-empty-function
				}
			], ev);
		}, 'Clear', 'tool-button') : undefined
	);
};

PrefabPropertyEditor.parser = (val: string) => {
	return val || null;
};


PrefabPropertyEditor.contextMenuInjection = (contextMenu: ContextMenuItem[], _field:EditablePropertyDesc, _clickedValue:any, _value:any) => {
	if (_clickedValue) {
		contextMenu.splice(contextMenu.indexOf(null) + 1, 0, {
			name: 'Reveal In Explorer',
			onClick: () => {
				const file = fs.getFileByAssetName(_clickedValue, AssetType.PREFAB);
				if (file) {
					fs.showFile(file.fileName);
				}
			}
		},
		{
			name: 'Edit prefab',
			onClick: () => {
				PrefabEditor.editPrefab(_clickedValue, true);
			}
		}
		);
	}
};

export default PrefabPropertyEditor;
