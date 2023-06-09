import { FileDesc } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy image name',
	onMouseDown: copyTextByClick
};


const assetItemRendererImage = (file: FileDesc) => {
	return R.div(
		{
			className: (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-current assets-item-image' : 'assets-item assets-item-image',
			key: file.assetName
		},
		R.textreIcon(file.fileName),
		R.span(assetsItemNameProps, file.assetName));
}

export default assetItemRendererImage;
