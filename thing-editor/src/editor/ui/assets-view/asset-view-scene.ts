import { FileDesc } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy scene name',
	onMouseDown: copyTextByClick
};

const assetItemRendererScene = (file: FileDesc) => {
	return R.div(
		{
			className: (file.assetName === game.editor.currentSceneName) ? 'assets-item assets-item-scene assets-item-current-scene' : 'assets-item assets-item-scene',
			key: file.assetName,
			onDblClick: () => {
				game.editor.openScene(file.assetName);
			},
			title: "Double click to open scene."
		},
		R.img({
			src: './img/asset-scene.png'
		}),
		R.span(assetsItemNameProps, file.assetName));
}


export default assetItemRendererScene;
