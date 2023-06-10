import fs, { FileDescImage } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import game from "thing-editor/src/engine/game";

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy image name',
	onMouseDown: copyTextByClick
};

const showImageContextMenu = (file: FileDescImage, ev: PointerEvent) => {
	showContextMenu([

		null,
		{
			name: R.fragment(R.icon('copy'), "Copy image`s name"),
			onClick: () => {
				game.editor.copyToClipboard(file.assetName);
			}
		},
		null,
		{
			name: R.fragment(R.icon('delete'), " Delete..."),
			onClick: () => {
				//TODO check image usage
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete image'),
						R.imageIcon(file.fileName)
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.ui.refresh();
					}, R.fragment(R.icon('delete'), " Delete.")
				);
			}
		}
	], ev);
}


const assetItemRendererImage = (file: FileDescImage) => {
	return R.div(
		{
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showImageContextMenu(file, ev);
			},
			className: (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-current assets-item-image' : 'assets-item assets-item-image',
			key: file.assetName
		},
		R.imageIcon(file.fileName),
		R.span(assetsItemNameProps, file.assetName));
}

export default assetItemRendererImage;
