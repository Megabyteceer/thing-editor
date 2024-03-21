import type { FileDesc } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import AssetsView, { addSharedAssetContextMenu, assetTypesIcons } from 'thing-editor/src/editor/ui/assets-view/assets-view';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import { MUTE_SOUND_MENU_ITEM } from 'thing-editor/src/editor/ui/main-menu';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import game from 'thing-editor/src/engine/game';

const BITRATE_PROPS = {
	className: 'semi-transparent'
};

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy sound name',
	onMouseDown: copyTextByClick
};

const assetItemRendererSound = (file: FileDesc) => {
	const isDefaultBitrate = !game.editor.projectDesc.soundBitRates.hasOwnProperty(file.assetName);
	return R.div(
		{
			className: (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-current assets-item-sound' : 'assets-item assets-item-sound',
			key: file.assetName,
			onContextMenu: (ev: PointerEvent) => {
				const currentBitrate = (game.editor.projectDesc.soundBitRates[file.assetName] || game.editor.projectDesc.soundDefaultBitrate);
				showContextMenu(addSharedAssetContextMenu(file, [
					MUTE_SOUND_MENU_ITEM,
					{
						name: R.fragment('Move to library...'),
						onClick: () => {
							game.editor.moveAssetToLibrary('Where to move sound \'' + file.assetName + '\'?', file);
						},
						disabled: () => game.editor.getUserVisibleFolders().length < 2
					},
					{
						name: R.span({ className: isDefaultBitrate ? 'semi-transparent' : undefined },
							'Bitrate ',
							currentBitrate,
							'kbps',
							isDefaultBitrate ? ' (default)' : undefined,
							' ▾'
						),
						onClick: (ev?: PointerEvent) => {
							showContextMenu([8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 192, 224, 256].map((bitrate) => {
								const isDefaultBitrate = bitrate === game.editor.projectDesc.soundDefaultBitrate;
								return {
									name: bitrate + 'kbps' + (isDefaultBitrate ? ' (default)' : ''),
									disabled: () => currentBitrate === bitrate,
									onClick: () => {
										const desc = file.lib ? game.editor.libsDescriptors[file.lib.name] : game.editor.projectDesc;
										if (!desc.soundBitRates) {
											desc.soundBitRates = {};
										}
										if (isDefaultBitrate) {
											delete desc.soundBitRates[file.assetName];
											delete game.editor.projectDesc.soundBitRates[file.assetName];
										} else {
											desc.soundBitRates[file.assetName] = bitrate;
											game.editor.projectDesc.soundBitRates[file.assetName] = bitrate;
										}
										game.editor.saveProjectDesc();
										game.editor.ui.refresh();
										fs.rebuildSounds(file.lib ? file.lib.assetsDir : game.editor.currentProjectAssetsDir);
									}
								};
							}), ev!);
						},
					},
					null,
					{
						name: R.fragment(R.icon('delete'), ' Delete \'' + file.assetName + '\' sound...'),
						onClick: () => {
							game.editor.ui.modal.showEditorQuestion(
								'Ase you sure?',
								R.fragment(
									R.div(null, 'You about to delete sound'),
									file.assetName
								), () => {
									fs.deleteAsset(file.assetName, file.assetType);
									game.editor.ui.refresh();
								}, R.fragment(R.icon('delete'), ' Delete.')
							);
						},
						disabled: () => !!(file.lib && file.lib.isEmbed)
					}
				]), ev);
			},
			onMouseDown: (ev: PointerEvent) => {
				if (ev.buttons === 1 && !(ev.target as HTMLDivElement).closest('.modal-content')) {
					game.editor.previewSound(file.assetName);
				}
			}
		},
		libInfo(file),
		assetTypesIcons.get(AssetType.SOUND),
		R.span(assetsItemNameProps, file.assetName,
			isDefaultBitrate ? undefined : R.span(
				BITRATE_PROPS, ' (', game.editor.projectDesc.soundBitRates[file.assetName], 'kbps)'
			)
		)
	);
};

export default assetItemRendererSound;
