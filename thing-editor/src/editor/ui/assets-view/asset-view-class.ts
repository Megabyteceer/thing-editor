import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs, { FileDescClass } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import game from "thing-editor/src/engine/game";
import loadSafeInstanceByClassName from "thing-editor/src/engine/utils/load-safe-instance-by-class-name";


const assetsItemNameProps = {
	className: 'selectable-text class-name',
	title: 'Ctrl+click to copy class`s name',
	onMouseDown: copyTextByClick
};


const showClassContextMenu = (file: FileDescClass, ev: PointerEvent) => {
	showContextMenu([
		{
			name: "Add as child",
			tip: "Add as child to currently selected.",
			onClick: () => {
				game.editor.attachToSelected(loadSafeInstanceByClassName(file.asset.__className));
			},
			disabled: !game.editor.isCanBeAddedAsChild(file.asset)
		},
		{
			name: "Add",
			tip: "Add to scene`s root.",
			onClick: () => {
				game.editor.addToScene(loadSafeInstanceByClassName(file.asset.__className));
			}
		},
		{
			name: "Wrap",
			tip: "Wraps selected content with a '" + file.assetName + "'",
			onClick: () => {
				editorUtils.wrapSelected(file.asset);
			}
		},
		null,
		{
			name: R.fragment(R.icon('copy'), "Copy class name"),
			onClick: () => {
				game.editor.copyToClipboard(file.asset.__className);
			}
		},
		{
			name: "Go to Source code >>>",
			tip: "Double click on class to go to it`s source code.",
			onClick: () => {
				game.editor.editClassSource(file.asset);
			}
		},
		null,
		{
			name: R.fragment(R.icon('delete'), " Delete..."),
			onClick: () => {
				//TODO check class usage
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete class'),
						renderClass(file)
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
					}, R.fragment(R.icon('delete'), " Delete.")
				);
			}
		}
	], ev);
}

const renderClass = (file: FileDescClass) => {
	return R.fragment(
		R.classIcon(file.asset),
		R.span(assetsItemNameProps,
			(file.asset).__className)
	);
}

const toolButtonsProps = {
	className: 'asset-item-tool-buttons',
	onDblClick: sp
}

const assetItemRendererClass = (file: FileDescClass) => {
	return R.div({
		className: 'assets-item assets-item-class',
		key: file.assetName,
		title: file.fileName,
		onContextMenu: (ev: PointerEvent) => {
			sp(ev);
			showClassContextMenu(file, ev);
		},
		onDblClick: () => {
			game.editor.editClassSource(file.asset as SourceMappedConstructor);
		}
	},
		renderClass(file),
		R.span(toolButtonsProps,
			R.btn('>', (ev) => {
				sp(ev);
				findNextOfThisType(file.asset, 1, ev.ctrlKey);
			}, 'Find next ' + file.asset.__className + '; Ctrl+click - find all.'),
			R.btn('<', (ev) => {
				sp(ev);
				findNextOfThisType(file.asset, -1, ev.ctrlKey);
			}, 'Find previous ' + file.asset.__className + '; Ctrl+click - find all.'))
	);
}

function findNextOfThisType(c: SourceMappedConstructor, direction: 1 | -1, findAll: boolean) {
	if(findAll) {
		let a = game.currentContainer.findChildrenByType(c as any).filter((o) => {
			return !getParentWhichHideChildren(o);
		});
		if(game.currentContainer instanceof c) {
			a.push(game.currentContainer);
		}
		game.editor.selection.clearSelection();
		for(let w of a) {
			game.editor.ui.sceneTree.selectInTree(w, true);
		}
	} else {
		game.editor.ui.sceneTree.findNext((o) => {
			return (o instanceof c) && !getParentWhichHideChildren(o);

		}, direction);
	}
}


export default assetItemRendererClass;

