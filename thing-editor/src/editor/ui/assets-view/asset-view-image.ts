import type { FileDescImage } from 'thing-editor/src/editor/fs';
import fs from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import AssetsView, { addSharedAssetContextMenu } from 'thing-editor/src/editor/ui/assets-view/assets-view';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy image name',
	onMouseDown: copyTextByClick
};

const showImageContextMenu = (file: FileDescImage, ev: PointerEvent) => {

	const menu: ContextMenuItem[] = [
		null,
		{
			name: R.fragment(R.icon('copy'), 'Copy image`s name'),
			onClick: () => {
				game.editor.copyToClipboard(file.assetName);
			}
		},
		null,
		{
			name: R.fragment('Move to library...'),
			onClick: async () => {
				game.editor.moveAssetToLibrary('Where to move image \'' + file.assetName + '\'?', file);
			},
			disabled: () => game.editor.getUserVisibleFolders().length < 2 || Lib.__isSystemTexture(file.asset, file.assetName)
		},
		{
			name: R.fragment(R.icon('delete'), ' Delete \'' + file.assetName + '\' image...'),
			onClick: () => {
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete image'),
						R.imageIcon(file)
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.ui.refresh();
					}, R.fragment(R.icon('delete'), ' Delete.')
				);
			},
			disabled: () => Lib.__isSystemTexture(file.asset, file.assetName)
		}
	];

	if (game.editor.selection.length) {
		const props = (game.editor.selection[0].constructor as SourceMappedConstructor).__editableProps;
		for (let i = props.length - 1; i >= 0; i--) {
			const prop = props[i];
			if (game.editor.ui.propsEditor.editableProps[prop.name]) {
				if (prop.type === 'image') {
					menu.unshift({
						name: 'Assign to "' + prop.name + '" >>',
						onClick: () => {
							game.editor.editProperty(prop, file.assetName);
						}
					});
				}
			}
		}
	}

	addSharedAssetContextMenu(file, menu);
	showContextMenu(menu, ev);
};


const assetItemRendererImage = (file: FileDescImage) => {
	return R.div(
		{
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showImageContextMenu(file as FileDescImage, ev);
			},
			className: (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-current assets-item-image' : 'assets-item assets-item-image',
			key: file.assetName
		},
		libInfo(file),
		R.imageIcon(file),
		R.span(assetsItemNameProps, file.assetName));
};

export default assetItemRendererImage;
