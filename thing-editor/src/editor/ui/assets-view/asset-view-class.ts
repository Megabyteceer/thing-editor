import type { FileDescClass } from 'thing-editor/src/editor/fs';
import fs from 'thing-editor/src/editor/fs';
import R, { renderClass } from 'thing-editor/src/editor/preact-fabrics';
import { addSharedAssetContextMenu } from 'thing-editor/src/editor/ui/assets-view/assets-view';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import getParentWhichHideChildren from 'thing-editor/src/editor/utils/get-parent-with-hidden-children';
import libInfo from 'thing-editor/src/editor/utils/lib-info';
import loadSafeInstanceByClassName from 'thing-editor/src/editor/utils/load-safe-instance-by-class-name';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const showClassContextMenu = (file: FileDescClass, ev: PointerEvent) => {
	showContextMenu(addSharedAssetContextMenu(file, [
		{
			name: 'Child',
			tip: 'Place as child to each selected object.',
			onClick: () => {
				let insertTo = game.editor.selection.slice();
				game.editor.selection.clearSelection();
				for (let o of insertTo) {
					game.editor.addTo(o, loadSafeInstanceByClassName(file.asset.__className));
				}
			},
			disabled: () => {
				return file.asset.__isScene || !game.editor.isCanBeAddedAsChild(file.asset);
			}
		},
		{
			name: 'Place',
			tip: 'Place to scene`s root.',
			onClick: () => {
				game.editor.selection.clearSelection();
				game.editor.addTo(game.currentContainer, loadSafeInstanceByClassName(file.asset.__className));
			},
			disabled: () => { return file.asset.__isScene || !game.editor.isCanBeAddedAsChild(file.asset, game.currentContainer); }
		},
		{
			name: 'Wrap',
			tip: 'Wraps selected content with a \'' + file.assetName + '\'',
			onClick: () => {
				editorUtils.wrapSelected(file.asset);
			},
			disabled: () => { return file.asset.__isScene || !game.editor.isCanBeAddedAsChild(file.asset); }
		},
		null,
		{
			name: R.fragment(R.icon('copy'), 'Copy class name'),
			onClick: () => {
				game.editor.copyToClipboard(file.asset.__className);
			}
		},
		{
			name: 'Go to Source code >>>',
			tip: 'Double click on class to go to it`s source code.',
			onClick: () => {
				game.editor.editClassSource(file.asset);
			}
		},
		null,
		{
			name: R.fragment(R.icon('asset-prefab'), 'Create new prefab...'),
			onClick: () => {
				editorUtils.savePrefab(file);
			},
			disabled: () => file.asset.__isScene
		},
		{
			name: R.fragment('Move to library...'),
			onClick: async () => {
				let chosenFolder: string | undefined = await game.editor.chooseAssetsFolder('Where to move class \'' + file.asset.__className + '\'?', file.lib ? file.lib.assetsDir : game.editor.currentProjectAssetsDir);
				if (!chosenFolder) {
					return;
				}
				fs.moveAssetToFolder(file, game.editor.currentProjectLibs.find(l => l.assetsDir === chosenFolder)!);
				game.editor.reloadClasses();
			},
			disabled: () => game.editor.getUserVisibleFolders().length < 2
		},
		{
			name: R.fragment(R.icon('delete'), ' Delete \'' + file.asset.__className + '\' class...'),
			onClick: () => {
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete class'),
						renderClass(file)
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.reloadClasses();
					}, R.fragment(R.icon('delete'), ' Delete.')
				);
			}
		}
	]), ev);
};

const toolButtonsProps = {
	className: 'asset-item-tool-buttons',
	onDblClick: sp
};

const assetItemRendererClass = (file: FileDescClass) => {
	let tip;
	if (!file.asset) {
		return R.fragment();
	}
	if (file.asset.__EDITOR_tip) {
		tip = R.tip('class-' + file.asset.__className,
			'Component "' + file.asset.__className + '" description:',
			file.asset.__EDITOR_tip
		);
	}

	const clickTip = '; Ctrl+click - find all. Alt+click - strict type';

	return R.div({
		className: 'assets-item assets-item-class',
		key: file.assetName,
		title: file.fileName,
		onContextMenu: (ev: PointerEvent) => {
			sp(ev);
			showClassContextMenu(file, ev);
		},
		onDblClick: () => {
			game.editor.editClassSource(file.asset);
		},
		onDragStart(ev: DragEvent) {
			ev.dataTransfer!.setData('text/drag-thing-editor-class-id', file.asset.__className);
		},
		draggable: true
	},
		libInfo(file),
		renderClass(file),
		tip,
		R.span(toolButtonsProps,
			R.btn('<', (ev) => {
				sp(ev);
				findNextOfThisType(file.asset, -1, ev.ctrlKey, ev.altKey);
			}, 'Find previous ' + file.asset.__className, clickTip),
			R.btn('>', (ev) => {
				sp(ev);
				findNextOfThisType(file.asset, 1, ev.ctrlKey, ev.altKey);
			}, 'Find next ' + file.asset.__className, clickTip)
		)
	);
};

function findNextOfThisType(c: SourceMappedConstructor, direction: 1 | -1, findAll: boolean, strictType: boolean) {
	if (findAll) {
		let a = game.currentContainer.findChildrenByType(c as any).filter((o) => {
			return !getParentWhichHideChildren(o);
		});
		if (game.currentContainer instanceof c) {
			a.push(game.currentContainer);
		}
		game.editor.selection.clearSelection();
		if (strictType) {
			a = a.filter(o => o.constructor === c);
		}
		for (let w of a) {
			game.editor.ui.sceneTree.selectInTree(w, true);
		}
	} else {
		game.editor.ui.sceneTree.findNext((o) => {
			if (strictType) {
				return (o instanceof c) && !getParentWhichHideChildren(o);
			} else {
				return (o.constructor === c) && !getParentWhichHideChildren(o);
			}
		}, direction);
	}
}


export default assetItemRendererClass;
