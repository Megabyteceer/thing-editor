import assert from "thing-editor/src/engine/debug/assert";

import { OutlineFilter } from '@pixi/filter-outline';
import { __EDITOR_inner_exitPreviewMode } from "thing-editor/src/editor/utils/preview-mode";
import game from "thing-editor/src/engine/game";
import { Container } from "pixi.js";

const selectionFilter = new OutlineFilter(2, 0xffff00);
selectionFilter.padding = 2;

type SelectionPath = (string | number)[];

type SelectionDataBase = SelectionPath[];

interface SelectionData extends SelectionDataBase {
	_stageX?: number;
	_stageY?: number;
	_stageS?: number;
}

export default class Selection extends Array {


	static IS_SELECTION_LOADING_TIME = false;

	add(_o: Container) {
		//TODO:
	}

	remove(o: Container) {
		assert(o.__nodeExtendData.isSelected, "Node is not selected.");
		let i = this.indexOf(o);
		assert(i >= 0, "Node is not registered in selected list.");
		o.__nodeExtendData.isSelected = false;
		o.removeFilter(selectionFilter);

		this.splice(i, 1);
		__EDITOR_inner_exitPreviewMode(o);
		if(!Selection.IS_SELECTION_LOADING_TIME) {
			game.editor.history.scheduleSelectionSave();
		}
		if(o.__onUnselect) {
			o.__onUnselect();
		}
		//TODO:
		//game.editor.ui.classesList.refresh();
	}

	saveSelection(): SelectionData {
		return this.map(getPathOfNode);
	}

	loadSelection(data: SelectionData) {
		Selection.IS_SELECTION_LOADING_TIME = true;
		if(!data || data.length === 0) {
			game.editor.selection.clearSelection();
		} else {
			this.clearSelection();
			data.some(selectNodeByPath);
		}
		// TreeNode.clearLastClicked(); //TODO:
		game.editor.refreshTreeViewAndPropertyEditor();
		Selection.IS_SELECTION_LOADING_TIME = false;
	}

	clearSelection() {
		//TODO:
	}

}

let getPathOfNode = (node: Container): SelectionPath => {
	let ret = [];
	while(node !== game.stage) {
		if(node.name && node.parent.children.filter((c) => { return c.name === node.name; }).length === 1) {
			ret.push(node.name);
		} else {
			ret.push(node.parent.getChildIndex(node));
		}
		node = node.parent;
	}
	return ret;
};

const selectNodeByPath = (path: SelectionPath) => {
	let ret = game.stage as Container;
	for(let i = path.length - 1; i >= 0 && ret; i--) {
		let p = path[i];
		if(typeof p === 'number') {
			if(p < ret.children.length) {
				ret = ret.getChildAt(p) as Container;
			} else {
				return;
			}
		} else {
			ret = ret.getChildByName(p) as Container;
		}
	}

	if(ret && ret !== game.stage) {
		game.editor.selection.add(ret);
	}
};

export type { SelectionData }