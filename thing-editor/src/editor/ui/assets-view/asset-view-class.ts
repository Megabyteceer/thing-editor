import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import { FileDescClass } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/show-context-menu";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import game from "thing-editor/src/engine/game";


const assetsItemNameProps = {
	className: 'selectable-text class-name',
	title: 'Ctrl+click to copy class`s name',
	onMouseDown: copyTextByClick
};

const showClassContextMenu = (file: FileDescClass, ev: PointerEvent) => {
	showContextMenu([
		{
			name: "123123",
			onClick: () => {
				alert(file.fileName);
			}
		},
		{
			name: "123123 2323r23r23r 3f 34f34 f34 f34f ",
			onClick: () => {
				alert(123123);
			}
		},
		null,
		{
			name: "123123",
			onClick: () => {
				alert(123123);
			}
		},
		{
			name: "123123",
			onClick: () => {
				alert(123123);
			}
		}


	], ev);
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
		R.classIcon(file.asset),
		R.b(assetsItemNameProps,
			(file.asset).__className),
		R.btn('>', (ev) => {
			sp(ev);
			findNextOfThisType(file.asset, 1, ev.ctrlKey);
		}, 'Find next ' + file.asset.__className + '; Ctrl+click - find all.', 'tool-btn'),
		R.btn('<', (ev) => {
			sp(ev);
			findNextOfThisType(file.asset, -1, ev.ctrlKey);
		}, 'Find previous ' + file.asset.__className + '; Ctrl+click - find all.', 'tool-btn'));
}

function findNextOfThisType(c: SourceMappedConstructor, direction: number, findAll: boolean) {
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

