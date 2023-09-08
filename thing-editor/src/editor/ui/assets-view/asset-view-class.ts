import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs, { FileDescClass } from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import copyTextByClick from "thing-editor/src/editor/utils/copy-text-by-click";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import libInfo from "thing-editor/src/editor/utils/lib-info";
import loadSafeInstanceByClassName from "thing-editor/src/editor/utils/load-safe-instance-by-class-name";
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
			name: "Child",
			tip: "Place as child to each selected object.",
			onClick: () => {
				let insertTo = game.editor.selection.slice();
				game.editor.selection.clearSelection();
				for(let o of insertTo) {
					game.editor.addTo(o, loadSafeInstanceByClassName(file.asset.__className));
				}
			},
			disabled: () => {
				return file.asset.__isScene || !game.editor.isCanBeAddedAsChild(file.asset);
			}
		},
		{
			name: "Place",
			tip: "Place to scene`s root.",
			onClick: () => {
				game.editor.selection.clearSelection();
				game.editor.addTo(game.currentContainer, loadSafeInstanceByClassName(file.asset.__className));
			},
			disabled: () => { return file.asset.__isScene; }
		},
		{
			name: "Wrap",
			tip: "Wraps selected content with a '" + file.assetName + "'",
			onClick: () => {
				editorUtils.wrapSelected(file.asset);
			},
			disabled: () => { return file.asset.__isScene || !game.editor.isCanBeAddedAsChild(file.asset); }
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
			name: R.fragment(R.icon('delete'), " Delete '" + file.asset.__className + "' class..."),
			onClick: () => {
				game.editor.ui.modal.showEditorQuestion(
					'Ase you sure?',
					R.fragment(
						R.div(null, 'You about to delete class'),
						renderClass(file)
					), () => {
						fs.deleteAsset(file.assetName, file.assetType);
						game.editor.reloadClasses();
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
	let tip;
	if(file.asset.__EDITOR_tip) {
		tip = R.tip('class-' + file.asset.__className,
			'Component "' + file.asset.__className + '" description:',
			file.asset.__EDITOR_tip
		);
	}

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
		libInfo(file),
		renderClass(file),
		tip,
		R.span(toolButtonsProps,
			R.btn('<', (ev) => {
				sp(ev);
				findNextOfThisType(file.asset, -1, ev.ctrlKey);
			}, 'Find previous ' + file.asset.__className + '; Ctrl+click - find all.'),
			R.btn('>', (ev) => {
				sp(ev);
				findNextOfThisType(file.asset, 1, ev.ctrlKey);
			}, 'Find next ' + file.asset.__className + '; Ctrl+click - find all.')
		)
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

