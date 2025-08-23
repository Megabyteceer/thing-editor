import type { Container } from 'pixi.js';
import type { FileDescPrefab } from 'thing-editor/src/editor/fs';
import fs from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import AssetsView, { addSharedAssetContextMenu } from 'thing-editor/src/editor/ui/assets-view/assets-view';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import copyTextByClick, { isEventBlockedByTextCopy } from 'thing-editor/src/editor/utils/copy-text-by-click';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import { getSerializedObjectClass } from 'thing-editor/src/editor/utils/generate-editor-typings';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game, { DEFAULT_FADER_NAME } from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import { CTRL_READABLE } from 'thing-editor/src/engine/utils/utils';
import { assetPreview } from './asset-preview';

const toolButtonsProps = {
	className: 'asset-item-tool-buttons',
	onDblClick: sp,
	onClick: sp
};

const assetsItemNameProps = {
	className: 'selectable-text',
	title: CTRL_READABLE + '+click to copy prefab`s name',
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
			name: R.fragment(R.icon('asset-prefab'), 'Edit prefab'),
			disabled: () => !game.__EDITOR_mode,
			onClick: () => {
				PrefabEditor.editPrefab(file.assetName);
			}
		},
		{
			name: R.fragment(R.icon('asset-prefab'), 'Duplicate prefab'),
			disabled: () => !game.__EDITOR_mode,
			onClick: () => {
				editorUtils.enterPrefabName(file.assetName, 'Enter name for duplicate prefab: ' + file.assetName).then((enteredName) => {
					if (enteredName) {
						const o = Lib.__loadPrefabNoInit(file.assetName);
						Lib.__savePrefab(o, enteredName);
						PrefabEditor.editPrefab(enteredName);
						Lib.destroyObjectAndChildren(o);
					}
				});
			}
		},
		{
			name: R.fragment(R.icon('asset-prefab'), 'Inherit prefab'),
			disabled: () => !game.__EDITOR_mode,
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
						if (file.assetName === PrefabEditor.currentPrefabName) {
							PrefabEditor.exitPrefabEdit(true);
						}
						fs.deleteAsset(file.assetName, file.assetType);
					}, R.fragment(R.icon('delete'), ' Delete.')
				);
			},
			disabled: () => file.assetName === DEFAULT_FADER_NAME
		}
	]), ev);
};

const assetItemRendererPrefab = (file: FileDescPrefab) => {
	let desc;
	if (file.asset?.p.__description) {
		desc = R.div(descriptionProps, file.asset.p.__description.split('\n')[0]);
	}
	const Class = getSerializedObjectClass(file.asset);
	const preview = assetPreview(file);

	return R.div(
		{
			className: (file.assetName === PrefabEditor.currentPrefabName) || (AssetsView.currentItemName === file.assetName) ? 'assets-item assets-item-prefab assets-item-current' : 'assets-item assets-item-prefab',
			key: file.assetName,
			onClick: (ev: PointerEvent) => {
				if (isEventBlockedByTextCopy(ev)) {
					return;
				}
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
		preview,
		R.span(assetsItemNameProps, file.assetName),
		R.span(toolButtonsProps,
			R.btn('<', (ev) => {
				sp(ev);
				findNextOfThisType(file.assetName, -1, (ev.ctrlKey || ev.metaKey));
			}, 'Find previous (hold ' + CTRL_READABLE + ' to find all)'),
			R.btn('>', (ev) => {
				sp(ev);
				findNextOfThisType(file.assetName, 1, (ev.ctrlKey || ev.metaKey));
			}, 'Find next (hold ' + CTRL_READABLE + ' to find all)')
		),
		desc
	);
};
const descriptionProps = { className: 'tree-desc' };

export default assetItemRendererPrefab;

function findNextOfThisType(name:string, direction: 1 | -1, findAll: boolean) {
	if (findAll) {
		let a = [] as Container[];

		game.currentContainer.forAllChildren((o)=> {
			if (o.__nodeExtendData.__deserializedFromPrefab === name) {
				a.push(o);
			}
		});
		if (game.currentContainer.__nodeExtendData.__deserializedFromPrefab === name) {
			a.push(game.currentContainer);
		}

		game.editor.selection.clearSelection();
		a = a.filter(o => !o.__nodeExtendData.isolate);

		const currentPrefab = PrefabEditor.currentPrefabName;
		for (let w of a) {
			game.editor.ui.sceneTree.selectInTree(w, true);
			if (currentPrefab !== PrefabEditor.currentPrefabName) {
				findNextOfThisType(name, direction, findAll);
				break;
			}
		}
	} else {
		game.editor.ui.sceneTree.findNext((o) => {
			return !o.__nodeExtendData.isolate && o.__nodeExtendData.__deserializedFromPrefab === name;
		}, direction);
	}
}
