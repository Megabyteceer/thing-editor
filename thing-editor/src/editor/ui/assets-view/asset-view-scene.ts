import type { ComponentChild } from 'preact';
import type { FileDescScene } from 'thing-editor/src/editor/fs';
import fs from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import AssetsView, { addSharedAssetContextMenu } from 'thing-editor/src/editor/ui/assets-view/assets-view';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import { onNewSceneClick, onSaveAsSceneClick } from 'thing-editor/src/editor/utils/scene-utils';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import { __UnknownClass } from 'thing-editor/src/editor/utils/unknown-class';
import assert from 'thing-editor/src/engine/debug/assert';
import game, { PRELOADER_SCENE_NAME } from 'thing-editor/src/engine/game';

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy scene`s name',
	onMouseDown: copyTextByClick
};

const showPrefabContextMenu = (file: FileDescScene, ev: PointerEvent) => {
	showContextMenu(addSharedAssetContextMenu(file, [
		{
			name: 'Edit scene',
			onClick: () => game.editor.openScene(file.assetName),
			disabled: () => game.editor.currentSceneName === file.assetName
		},
		null,
		{
			name: 'New scene...',
			onClick: onNewSceneClick
		},
		{
			name: 'Save as...',
			onClick: onSaveAsSceneClick
		},
		null,
		{
			name: 'Go to Source code >>>',
			tip: 'Double click on class to go to it`s source code.',
			onClick: () => {
				game.editor.editClassSource(game.classes[file.asset.c!]);
			}
		},
		null,
		{
			name: R.fragment('Move  to library...'),
			onClick: async () => {
				game.editor.moveAssetToLibrary('Where to move scene \'' + file.assetName + '\'?', file);
			},
			disabled: () => game.editor.getUserVisibleFolders().length < 2
		},
		{
			name: R.fragment(R.icon('delete'), ' Delete \'' + file.assetName + '\' scene...'),
			onClick: () => {
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete scene'),
						file.assetName
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.openScene(game.projectDesc.mainScene);
					}, R.fragment(R.icon('delete'), ' Delete.')
				);
			},
			disabled: () => game.projectDesc.mainScene === file.assetName || file.assetName === PRELOADER_SCENE_NAME
		}
	]), ev);
};

const assetItemRendererScene = (file: FileDescScene): ComponentChild => {
	assert(file.asset.c, 'scene can not be prefab reference');

	const isCurrent = (file.assetName === game.editor.currentSceneName) || (AssetsView.currentItemName === game.editor.currentSceneName);

	return R.div(
		{
			className: isCurrent ? 'assets-item assets-item-scene assets-item-current' : 'assets-item assets-item-scene',
			key: file.assetName,
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showPrefabContextMenu(file, ev);
			},
			onClick: (ev: PointerEvent) => {
				if (!isCurrent && !editorUtils.isInModal(ev.target)) {
					game.editor.openScene(file.assetName);
				}
			},
			title: 'click to open scene.'
		},
		libInfo(file),
		R.classIcon(game.classes[file.asset.c!] || __UnknownClass),
		R.span(assetsItemNameProps, file.assetName));
};


export default assetItemRendererScene;
