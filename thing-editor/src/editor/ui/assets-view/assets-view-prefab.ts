import fs, { FileDescPrefab } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import libInfo from "thing-editor/src/editor/utils/lib-info";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import { __UnknownClass } from "thing-editor/src/editor/utils/unknown-class";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: copyTextByClick
};

const placeAsChild = (file: FileDescPrefab) => {

	let insertTo = game.editor.selection.slice();
	game.editor.selection.clearSelection();
	for(let o of insertTo) {
		game.editor.addTo(o, Lib.__loadPrefabReference(file.assetName));
	}
}

const showPrefabContextMenu = (file: FileDescPrefab, ev: PointerEvent) => {
	showContextMenu([
		{
			name: "Place as child",
			tip: "Place as child to each selected object. (Alt + Click)",
			onClick: () => placeAsChild(file),
			disabled: () => !game.editor.selection.length
		},
		{
			name: "Place",
			tip: "Place to scene`s root.",
			onClick: () => {
				game.editor.selection.clearSelection();
				game.editor.addTo(game.currentContainer, Lib.__loadPrefabReference(file.assetName));
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
				game.editor.editClassSource(game.classes[file.asset.c!]);
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
	assert(file.asset.c, "rendering of prefab referenced to prefab not supported. TODO");
	return R.div(
		{
			className: (file.assetName === PrefabEditor.currentPrefabName) || (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-prefab assets-item-current' : 'assets-item assets-item-prefab',
			key: file.assetName,
			onPointerDown: (ev: PointerEvent) => {
				if(PrefabEditor.currentPrefabName !== file.assetName && !editorUtils.isInModal(ev.target)) {
					if(ev.buttons === 1) {
						if(ev.altKey) {
							if(game.editor.selection.length) {
								while(game.editor.selection[0].__nodeExtendData.isPrefabReference) {
									let p = game.editor.selection[0].parent;
									if(p === game.stage) {
										break;
									}
									game.editor.selection.clearSelection();
									game.editor.selection.add(p);
								}
								placeAsChild(file);
							}
						} else {
							PrefabEditor.editPrefab(file.assetName);
						}
					}
				}
			},
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showPrefabContextMenu(file, ev);
			},
			onDblClick: () => {
				let Class = game.classes[file.asset.c!];
				game.editor.editClassSource(Class, file.asset.c!);
			},
			title: "Click to edit prefab. Alt + Click - place as child"
		},
		libInfo(file),
		R.classIcon(game.classes[file.asset.c!] || __UnknownClass),
		R.span(assetsItemNameProps, file.assetName));
}


export default assetItemRendererPrefab;
