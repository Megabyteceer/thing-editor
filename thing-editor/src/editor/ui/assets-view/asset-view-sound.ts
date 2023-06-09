import { AssetType, FileDesc } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView, { assetTypesIcons } from "thing-editor/src/editor/ui/assets-view/assets-view";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy sound name',
	onMouseDown: copyTextByClick
};

const assetItemRendererSound = (file: FileDesc) => {
	return R.div(
		{
			className: (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-current assets-item-sound' : 'assets-item assets-item-sound',
			key: file.assetName,
			onPointerDown: () => {
				game.editor.previewSound(file.assetName);
			}
		},
		assetTypesIcons.get(AssetType.SOUND),
		R.span(assetsItemNameProps, file.assetName));
}

export default assetItemRendererSound;
