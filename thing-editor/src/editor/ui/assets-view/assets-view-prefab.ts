import fs, { FileDescPrefab } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import { __UnknownClass } from "thing-editor/src/editor/utils/unknown-class";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: copyTextByClick
};

const showClassContextMenu = (file: FileDescPrefab, ev: PointerEvent) => {
	showContextMenu([
		{
			name: "Add as child",
			tip: "Add as child to currently selected.",
			onClick: () => {
				//TODO
			},
			disabled: !game.editor.selection.length
		},
		{
			name: "Add",
			tip: "Add to scene`s root.",
			onClick: () => {
				//TODO
			}
		},
		null,
		{
			name: R.fragment(R.icon('copy'), "Copy prefab`s name"),
			onClick: () => {
				game.editor.copyToClipboard(file.assetName);
			}
		},
		{
			name: "Go to Source code >>>",
			tip: "Double click on class to go to it`s source code.",
			onClick: () => {
				game.editor.editClassSource(game.classes[file.asset.c]);
			}
		},
		null,
		{
			name: R.fragment(R.icon('delete'), " Delete..."),
			onClick: () => {
				//TODO check class usage
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete prefab'),
						file.assetName
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.ui.refresh();
					}, R.fragment(R.icon('delete'), " Delete.")
				);
			}
		}
	], ev);
}

const assetItemRendererPrefab = (file: FileDescPrefab) => {
	return R.div(
		{
			className: (file.assetName === PrefabEditor.currentPrefabName) ? 'assets-item assets-item-prefab assets-item-current' : 'assets-item assets-item-prefab',
			key: file.assetName,
			onPointerDown: (ev: PointerEvent) => {
				if(ev.buttons === 1) {
					if(ev.altKey) {
						//TODO add as child
					} else {
						PrefabEditor.editPrefab(file.assetName);
					}
				} else {
					//TODO prefab context meny
				}
			},
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showClassContextMenu(file, ev);
			},
			onDblClick: () => {
				let Class = game.classes[file.asset.c];
				game.editor.editClassSource(Class, file.asset.c);
			},
			title: "click to edit prefab."
		},
		R.classIcon(game.classes[file.asset.c] || __UnknownClass),
		R.span(assetsItemNameProps, file.assetName));
}


export default assetItemRendererPrefab;
