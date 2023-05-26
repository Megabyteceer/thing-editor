import { FileDescPrefab } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import { __UnknownClass } from "thing-editor/src/editor/utils/unknown-class";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: copyTextByClick
};

const assetItemRendererPrefab = (file: FileDescPrefab) => {
	return R.div(
		{
			className: (file.assetName === game.editor.currentSceneName) ? 'assets-item assets-item-prefab assets-item-current' : 'assets-item assets-item-prefab',
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
