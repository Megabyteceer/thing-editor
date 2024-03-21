import type { FileDescPrefab } from 'thing-editor/src/editor/fs';
import fs from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import AssetsView, { addSharedAssetContextMenu } from 'thing-editor/src/editor/ui/assets-view/assets-view';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import { getSerializedObjectClass, regeneratePrefabsTypings } from 'thing-editor/src/editor/utils/generate-editor-typings';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game, { DEFAULT_FADER_NAME } from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

const assetsItemNameProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy prefab`s name',
	onMouseDown: copyTextByClick
};

const placeAsChild = (file: FileDescPrefab) => {

	let insertTo = game.editor.selection.slice();
	game.editor.selection.clearSelection();
	for (let o of insertTo) {
		game.editor.addTo(o, Lib.__loadPrefabReference(file.assetName));
	}
};

const showPrefabContextMenu = (file: FileDescPrefab, ev: PointerEvent) => {
	showContextMenu(addSharedAssetContextMenu(file, [
		{
			name: 'Child',
			tip: 'Place as child to each selected object. (Alt + Click)',
			onClick: () => placeAsChild(file),
			disabled: () => !game.editor.selection.length
		},
		{
			name: 'Place',
			tip: 'Place to scene`s root.',
			onClick: () => {
				game.editor.selection.clearSelection();
				game.editor.addTo(game.currentContainer, Lib.__loadPrefabReference(file.assetName));
			}
		},
		{
			name: 'Wrap',
			tip: 'Wraps selected content with a \'' + file.assetName + '\'',
			onClick: () => {
				editorUtils.wrapSelected(undefined, file.assetName);
			}
		},
		null,
		{
			name: R.fragment(R.icon('asset-prefab'), 'Duplicate prefab'),
			onClick: () => {
				editorUtils.enterPrefabName(file.assetName, 'Enter name for duplicate prefab: ' + file.assetName).then((enteredName) => {
					if (enteredName) {
						const o = Lib.loadPrefab(file.assetName);
						Lib.__savePrefab(o, enteredName);
						PrefabEditor.editPrefab(enteredName);
						Lib.destroyObjectAndChildren(o);
					}
				});
			}
		},
		{
			name: R.fragment(R.icon('asset-prefab'), 'Create inherited prefab'),
			onClick: () => {
				editorUtils.enterPrefabName(file.assetName, 'Enter name for inherited prefab: ' + file.assetName).then((enteredName) => {
					if (enteredName) {
						const o = Lib._loadClassInstanceById('Container');
						o.__nodeExtendData.isPrefabReference = file.assetName;
						Lib.__savePrefab(o, enteredName);
						PrefabEditor.editPrefab(enteredName);
					}
				});
			}
		},
		{
			name: R.fragment(R.icon('copy'), 'Copy prefab`s name'),
			onClick: () => {
				game.editor.copyToClipboard(file.assetName);
			}
		},
		{
			name: 'Go to Source code >>>',
			tip: 'Double click on class to go to it`s source code.',
			onClick: () => {
				game.editor.editClassSource(getSerializedObjectClass(file.asset));
			}
		},
		null,
		{
			name: R.fragment('Move to library...'),
			onClick: async () => {
				game.editor.moveAssetToLibrary('Where to move prefab \'' + file.assetName + '\'?', file);
			},
			disabled: () => game.editor.getUserVisibleFolders().length < 2
		},
		{
			name: R.fragment(R.icon('delete'), ' Delete \'' + file.assetName + '\' prefab...'),
			onClick: () => {
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete prefab'),
						file.assetName
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.ui.refresh();
						regeneratePrefabsTypings();
					}, R.fragment(R.icon('delete'), ' Delete.')
				);
			},
			disabled: () => file.assetName === DEFAULT_FADER_NAME || file.assetName === PrefabEditor.currentPrefabName
		}
	]), ev);
};

const assetItemRendererPrefab = (file: FileDescPrefab) => {
	const Class = getSerializedObjectClass(file.asset);
	return R.div(
		{
			className: (file.assetName === PrefabEditor.currentPrefabName) || (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-prefab assets-item-current' : 'assets-item assets-item-prefab',
			key: file.assetName,
			onClick: (ev: PointerEvent) => {
				if (PrefabEditor.currentPrefabName !== file.assetName && !editorUtils.isInModal(ev.target)) {

					if (ev.altKey) {
						if (!game.editor.selection.length) {
							game.editor.selection.add(game.currentContainer);
						}
						while (game.editor.selection[0].__nodeExtendData.isPrefabReference) {
							let p = game.editor.selection[0].parent;
							if (p === game.stage) {
								break;
							}
							game.editor.selection.clearSelection();
							game.editor.selection.add(p);
						}
						placeAsChild(file);
					}
					else {
						PrefabEditor.editPrefab(file.assetName);
					}

				}
			},
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showPrefabContextMenu(file, ev);
			},
			onDblClick: () => {
				game.editor.editClassSource(Class, file.asset.c);
			},
			title: 'Click to edit prefab. Alt + Click - place as child',
			onDragStart(ev: DragEvent) {
				ev.dataTransfer!.setData('text/drag-thing-editor-prefab-name', file.assetName);
			},
			draggable: true
		},
		libInfo(file),
		R.classIcon(Class),
		R.span(assetsItemNameProps, file.assetName));
};


export default assetItemRendererPrefab;
