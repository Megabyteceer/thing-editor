import assert from "thing-editor/src/engine/debug/assert";

import { OutlineFilter } from '@pixi/filter-outline';

import { Container } from "pixi.js";
import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import TreeNode from "thing-editor/src/editor/ui/tree-view/tree-node";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import game from "thing-editor/src/engine/game";

const selectionFilter = new OutlineFilter(2, 0xffff00);
selectionFilter.padding = 2;
let filterPhase = false;

setInterval(() => {
	if(filterPhase || game.editor.isHelpersHidden) {
		if(selectionFilter.alpha > 0) {
			selectionFilter.alpha -= 0.02;
			if(selectionFilter.alpha < 0.5) {
				filterPhase = false;
			}
		}
	} else {
		selectionFilter.alpha += 0.02;
		if(selectionFilter.alpha > 0.7) {
			filterPhase = true;
		}
	}

}, 30);

type SelectionPath = (string | number)[];

type SelectionDataBase = SelectionPath[];

interface SelectionData extends SelectionDataBase {
	_stageX?: number;
	_stageY?: number;
	_stageS?: number;
}

let IS_SELECTION_LOADING_TIME = false;

export default class Selection extends Array<Container> {

	select(object: Container, add?: boolean) {
		if(!add) {
			this.clearSelection();
		}
		if(object.__nodeExtendData.isSelected) {
			this.remove(object);
		} else {
			this.add(object);
		}
		this.sortSelectedNodes();
		game.editor.refreshTreeViewAndPropertyEditor();
	}

	sortSelectedNodes() {
		recalculateNodesDeepness();
		this.sort(sortByDeepness);
	}

	add(o: Container) {
		let nodePath = getPathOfNode(o);
		let hidingParent = getParentWhichHideChildren(o, true);
		if(hidingParent && (hidingParent !== o)) {
			//TODO проверить как выделяет чилда внутри префаба.
			if(hidingParent.__nodeExtendData.isPrefabReference) {
				let parentPath = getPathOfNode(hidingParent);
				nodePath.length -= parentPath.length;

				let prefabName = hidingParent.__nodeExtendData.isPrefabReference;

				if(prefabName) {
					game.editor.ui.modal.showEditorQuestion("Object is in inside prefab", "Do you want to go to prefab '" + prefabName + "', containing this object?", () => {
						PrefabEditor.editPrefab(prefabName);
						game.editor.selection.loadSelection([nodePath]);
					});
				}
			}
			game.editor.ui.modal.showInfo('Can not select object, because it is hidden by parent ' + (hidingParent.constructor as SourceMappedConstructor).__className + '; ' + o.___info, 'Can not select object', 30015);
			return;
		}

		assert(!o.__nodeExtendData.isSelected, "Node is selected already.");
		assert(this.indexOf(o) < 0, "Node is registered in selected list already.");
		o.__nodeExtendData.isSelected = true;
		let p = o.parent;
		while(p && p !== game.stage) {
			let data = p.__nodeExtendData;
			if(!data.hidden) {
				data.childrenExpanded = true;
			}
			p = p.parent;
		}
		o.addFilter(selectionFilter);
		this.push(o);
		o.__onSelect();

		/*game.editor.ui.viewport.scrollInToScreen(o); //TODO
		game.editor.ui.classesList.refresh();*/
		if(!IS_SELECTION_LOADING_TIME) {
			game.editor.history.scheduleSelectionSave();
		}
	}

	remove(o: Container) {
		game.editor.blurInputs();
		assert(o.__nodeExtendData.isSelected, "Node is not selected.");
		let i = this.indexOf(o);
		assert(i >= 0, "Node is not registered in selected list.");
		o.__nodeExtendData.isSelected = false;
		o.removeFilter(selectionFilter);

		this.splice(i, 1);
		editorUtils.exitPreviewMode(o);
		if(!IS_SELECTION_LOADING_TIME) {
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
		IS_SELECTION_LOADING_TIME = true;
		if(!data || data.length === 0) {
			game.editor.selection.clearSelection();
		} else {
			this.clearSelection();
			data.some(selectNodeByPath);
		}
		TreeNode.clearLastClicked();
		game.editor.refreshTreeViewAndPropertyEditor();
		IS_SELECTION_LOADING_TIME = false;
	}

	clearSelection(refreshUI = false) {
		while(this.length > 0) {
			this.remove(this[this.length - 1]);
		}
		TreeNode.clearLastClicked();
		if(refreshUI) {
			game.editor.refreshTreeViewAndPropertyEditor();
		}
	}

	saveCurrentSelection() {
		game.settings.setItem('__EDITOR_scene_selection' + game.editor.currentSceneName, game.editor.selection.saveSelection());
	}

	loadCurrentSelection() {
		this.loadSelection(game.settings.getItem('__EDITOR_scene_selection' + game.editor.currentSceneName));
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

export type { SelectionData };


//-------- sorting selection --------------------------------
let curDeepness = 0;

let recalculateNodesDeepness = () => {
	curDeepness = 0;
	recalculateNodesDeepnessRecursive(game.stage);
};

let recalculateNodesDeepnessRecursive = (n: Container) => {
	n.__nodeExtendData.deepness = curDeepness++;
	if(n.hasOwnProperty('children')) {
		n.children.some(recalculateNodesDeepnessRecursive as ((c: any, i: any, a: any) => void));
	}
};

let sortByDeepness = (a: Container, b: Container): number => {
	return (a.__nodeExtendData.deepness as number) - (b.__nodeExtendData.deepness as number);
};
