import { FileDesc } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import game from "thing-editor/src/engine/game";

let assetPreviewImage: HTMLDivElement | null = null;
let assetPreviewTimeout: number | null = null;

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy image name',
	onMouseDown: copyTextByClick
};

const hidePreview = () => {
	if(assetPreviewImage) {
		assetPreviewImage.remove();
		assetPreviewImage = null;
	}
	if(assetPreviewTimeout) {
		clearTimeout(assetPreviewTimeout);
		assetPreviewTimeout = null;
	}
}

const assetItemRendererImage = (file: FileDesc) => {
	return R.div(
		{
			className: 'assets-item assets-item-image',
			key: file.assetName
		},
		R.img({
			src: file.fileName,
			onMouseEnter: onImageAssetEnter,
			onMouseLeave: onImageAssetLeave
		}),
		R.span(assetsItemNameProps, file.assetName));
}

const onImageAssetEnter = (ev: MouseEvent) => {
	hidePreview();
	assetPreviewTimeout = setTimeout(() => {
		assetPreviewTimeout = null;
		assetPreviewImage = document.createElement('div');
		assetPreviewImage.style.backgroundImage = 'url("' + (ev.target as HTMLImageElement).src + '")';
		assetPreviewImage.className = 'image-preview-tooltip fadein-animation';
		assetPreviewImage.style.left = Math.max(0, game.editor.mouseX - 128) + 'px';
		assetPreviewImage.style.top = Math.max(128, game.editor.mouseY) + 'px';
		document.body.appendChild(assetPreviewImage)
	}, 100);
}

const onImageAssetLeave = () => {
	hidePreview();
};

export default assetItemRendererImage;
