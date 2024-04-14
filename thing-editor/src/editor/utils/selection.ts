import assert from 'thing-editor/src/engine/debug/assert';

import { OutlineFilter } from '@pixi/filter-outline';

import type { Container } from 'pixi.js';
import TreeNode from 'thing-editor/src/editor/ui/tree-view/tree-node';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import getParentWhichHideChildren from 'thing-editor/src/editor/utils/get-parent-with-hidden-children';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';

const selectionFilter = new OutlineFilter(3, 0xffff00);
selectionFilter.padding = 3;
let filterPhase = false;

window.setInterval(() => {
	if (filterPhase || !game.editor.isGizmoVisible) {
		if (selectionFilter.alpha > 0) {
			selectionFilter.alpha -= 0.02;
			if (selectionFilter.alpha < 0.5) {
				filterPhase = false;
			}
		}
	} else {
		selectionFilter.alpha += 0.02;
		if (selectionFilter.alpha > 0.7) {
			filterPhase = true;
		}
	}

	selectionFilter.thickness = 3 * game.editor.ui.viewport.viewportScale;

}, 30);

interface SelectionPathEntry {
	n: string | null;
	i: number;
}
type SelectionPath = SelectionPathEntry[];

type SelectionDataBase = SelectionPath[];

interface SelectionData extends SelectionDataBase {
	_stageX?: number;
	_stageY?: number;
	_stageS?: number;
}

let IS_SELECTION_LOADING_TIME = false;

export default class Selection extends Array<Container> {

	select(object: Container, add?: boolean, onTreeViewUpdated?:() => void) {
		if (!add) {
			this.clearSelection();
		}
		if (object.__nodeExtendData.isSelected) {
			this.remove(object);
		} else {
			this.add(object);
		}
		filterPhase = false;
		this.sortSelectedNodes();
		game.editor.refreshTreeViewAndPropertyEditor(onTreeViewUpdated);
	}

	sortSelectedNodes() {
		recalculateNodesDeepness();
		this.sort(sortByDeepness);
	}

	add(o: Container) {
		let nodePath = getPathOfNode(o);
		let hidingParent = getParentWhichHideChildren(o, true);
		if (hidingParent && (hidingParent !== o)) {
			let popupShown = false;
			if (hidingParent.__nodeExtendData.isPrefabReference) {
				let parentPath = getPathOfNode(hidingParent);
				nodePath.length -= parentPath.length;

				let prefabName = hidingParent.__nodeExtendData.isPrefabReference;

				if (prefabName) {
					popupShown = true;
					game.editor.ui.modal.showEditorQuestion('Object is in inside prefab', 'Do you want to go to prefab \'' + prefabName + '\', containing this object?', () => {
						PrefabEditor.editPrefab(prefabName);
						game.editor.selection.loadSelection([nodePath]);
					});
				}
			}
			if (!popupShown) {
				game.editor.ui.modal.showInfo('Can not select object, because it is hidden by parent ' + (hidingParent.constructor as SourceMappedConstructor).__className + '; ' + o.___info, 'Can not select object', 30015);
			}
			return;
		}

		assert(!o.__nodeExtendData.isSelected, 'Node is selected already.');
		assert(this.indexOf(o) < 0, 'Node is registered in selected list already.');
		o.__nodeExtendData.isSelected = true;
		let p = o.parent;
		while (p && p !== game.stage) {
			let data = p.__nodeExtendData;
			if (!data.hidden) {
				data.childrenExpanded = true;
			}
			p = p.parent;
		}
		o.addFilter(selectionFilter);
		this.push(o);
		o.__onSelect();

		game.editor.ui.viewport.scrollInToScreen(o);

		if (!IS_SELECTION_LOADING_TIME) {
			game.editor.history.scheduleSelectionSave();
		}
	}

	remove(o: Container) {
		game.editor.blurPropsInputs();
		assert(o.__nodeExtendData.isSelected, 'Node is not selected.');
		let i = this.indexOf(o);
		assert(i >= 0, 'Node is not registered in selected list.');
		o.__nodeExtendData.isSelected = false;
		o.removeFilter(selectionFilter);

		this.splice(i, 1);
		editorUtils.exitPreviewMode(o);
		if (!IS_SELECTION_LOADING_TIME) {
			game.editor.history.scheduleSelectionSave();
		}
		if (o.__onUnselect) {
			o.__onUnselect();
		}
	}

	saveSelection(): SelectionData {
		return this.map(getPathOfNode);
	}

	loadSelection(data: SelectionData) {
		IS_SELECTION_LOADING_TIME = true;
		if (!data || data.length === 0) {
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
		while (this.length > 0) {
			this.remove(this[this.length - 1]);
		}
		TreeNode.clearLastClicked();
		if (refreshUI) {
			game.editor.refreshTreeViewAndPropertyEditor();
		}
	}

	saveCurrentSelection() {
		game.editor.settingsLocal.setItem('__EDITOR_scene_selection' + game.editor.currentSceneName, game.editor.selection.saveSelection());
	}

	loadCurrentSelection() {
		this.loadSelection(game.editor.settingsLocal.getItem('__EDITOR_scene_selection' + game.editor.currentSceneName));
	}
}

let getPathOfNode = (node: Container): SelectionPath => {
	let ret: SelectionPath = [];
	while (node !== game.stage) {
		const a = node.parent.children.filter((c) => { return c.name === node.name; });
		ret.push({ n: node.name, i: a.indexOf(node) });
		node = node.parent;
	}
	return ret;
};

const selectNodeByPath = (path: SelectionPath) => {
	let ret = game.stage as Container;
	for (let i = path.length - 1; i >= 0 && ret; i--) {
		let p = path[i];
		const a = ret.children.filter((c) => { return c.name === p.n; });
		if (p.i < a.length) {
			ret = a[p.i] as Container;
		} else {
			return;
		}
	}

	if (ret && ret !== game.stage) {
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
	if (n.hasOwnProperty('children')) {
		n.children.some(recalculateNodesDeepnessRecursive as ((c: any, i: any, a: any) => void));
	}
};

let sortByDeepness = (a: Container, b: Container): number => {
	return (a.__nodeExtendData.deepness as number) - (b.__nodeExtendData.deepness as number);
};
