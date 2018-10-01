import Tilemap from "thing-engine/js/components/tilemap.js";
import game from "thing-engine/js/game.js";

let IS_SELECTION_LOADING_TIME = false;
let needSaveSelectionInToHistory = false;

class Selection extends Array {
	
	select(object, add) {
		if (!add) {
			this.clearSelection();
		}
		if (__getNodeExtendData(object).isSelected) {
			this.remove(object);
		} else {
			this.add(object);
		}
		this.sortSelectedNodes();
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	sortSelectedNodes() {
		recalculateNodesDeepness();
		this.sort(sortByDeepness);
	}
	
	loadSelection(data) {
		IS_SELECTION_LOADING_TIME = true;
		if (!data || data.length === 0) {
			editor.selection.clearSelection();
		} else {
			editor.selection.clearSelection();
			data.some(selectNodeByPath);
		}
		editor.refreshTreeViewAndPropertyEditor();
		IS_SELECTION_LOADING_TIME = false;
	}
	
	saveSelection() {
		return this.map(getPathOfNode);
	}
	
	clearSelection(refresh) {
		while (this.length > 0) {
			this.remove(this[this.length - 1]);
		}
		if (refresh) {
			editor.refreshTreeViewAndPropertyEditor();
		}
	}
	
	add(o) {
		assert(!__getNodeExtendData(o).isSelected);
		assert(this.indexOf(o) < 0);
		__getNodeExtendData(o).isSelected = true;
		let p = o.parent;
		while(p && p !== game.stage) {
			__getNodeExtendData(p).childsExpanded = true;
			p = p.parent;
		}
		if(!(o instanceof Tilemap)) {
			o.addFilter(selectionFilter);
		}
		this.push(o);
		o.__onSelect();

		editor.ui.viewport.scrollInToScreen(o);
		if(!IS_SELECTION_LOADING_TIME) {
			needSaveSelectionInToHistory = true;
		}
	}
	
	remove(o) {
		assert(__getNodeExtendData(o).isSelected);
		let i = this.indexOf(o);
		assert(i >= 0);
		__getNodeExtendData(o).isSelected = false;
		if(!(o instanceof Tilemap)) {
			o.removeFilter(selectionFilter);
		}
		this.splice(i, 1);
		o.__EDITOR_inner_exitPreviewMode();
		if(!IS_SELECTION_LOADING_TIME) {
			needSaveSelectionInToHistory = true;
		}
	}
}

export default Selection;

const selectionFilter = new PIXI.filters.OutlineFilter(2, 0xffff00);

setInterval(() => {
	if (window.editor && editor.selection.length > 0) {
		selectionFilter.color ^= 0x063311;
	}
	if(needSaveSelectionInToHistory) {
		if(game.__EDITORmode) {
			editor.history.addHistoryState(true);
		}
		needSaveSelectionInToHistory = false;
	}

}, 1000 / 60 * 3);

//save/load selection

let getPathOfNode = (node) => {
	let ret = [];
	while (node !== game.currentContainer) {
		if(node.name && node.parent.children.filter((c)=>{return c.name === node.name;}).length === 1) {
			ret.push(node.name);
		} else {
			ret.push(node.parent.getChildIndex(node));
		}
		node = node.parent;
	}
	return ret;
};

let selectNodeByPath = (path) => {
	let ret = game.currentContainer;
	for (let i = path.length - 1; i >= 0 && ret; i--) {
		let p = path[i];
		if(typeof p === 'number') {
			if(p < ret.children.length) {
				ret = ret.getChildAt(p);
			} else {
				return;
			}
		} else {
			ret = ret.getChildByName(p);
		}
	}
	
	if(ret) {
		editor.selection.add(ret);
	}
};


//-------- sorting selection --------------------------------
let curDeepness;

let recalculateNodesDeepness = () => {
	curDeepness = 0;
	recalculateNodesDeepnessRecursive(game.currentContainer);
};

let recalculateNodesDeepnessRecursive = (n) => {
	__getNodeExtendData(n).deepness = curDeepness++;
	if (n.hasOwnProperty('children')) {
		n.children.some(recalculateNodesDeepnessRecursive);
	}
};

let sortByDeepness = (a, b) => {
	return __getNodeExtendData(a).deepness - __getNodeExtendData(b).deepness;
};

