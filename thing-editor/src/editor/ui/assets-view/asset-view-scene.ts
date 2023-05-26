import { ComponentChild } from "preact";
import { FileDescScene } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import { __UnknownClass } from "thing-editor/src/editor/utils/unknown-class";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy scene`s name',
	onMouseDown: copyTextByClick
};

const assetItemRendererScene = (file: FileDescScene): ComponentChild => {
	return R.div(
		{
			className: (file.assetName === game.editor.currentSceneName) ? 'assets-item assets-item-scene assets-item-current' : 'assets-item assets-item-scene',
			key: file.assetName,
			onDblClick: () => {
				game.editor.openScene(file.assetName);
			},
			title: "Double click to open scene."
		},
		R.classIcon(game.classes[file.asset.c] || __UnknownClass),
		R.span(assetsItemNameProps, file.assetName));
}


export default assetItemRendererScene;
