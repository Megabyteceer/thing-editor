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
		EDITOR.refreshTreeViewAndPropertyEditor();
	}
	
	sortSelectedNodes() {
		recalculateNodesDeepness();
		this.sort(sortByDeepness);
	}
	
	loadSelection(data) {
		if (!data || data.length === 0) {
			EDITOR.selection.clearSelection();
		} else {
			data.some(selectNodeByPath);
		}
		EDITOR.refreshTreeViewAndPropertyEditor();
	}
	
	saveSelection() {
		return this.map(getPathOfNode);
	}
	
	clearSelection(refresh) {
		while (this.length > 0) {
			this.remove(this[this.length - 1]);
		}
		if (refresh) {
			EDITOR.refreshTreeViewAndPropertyEditor();
		}
	}
	
	add(o) {
		assert(!__getNodeExtendData(o).isSelected);
		assert(this.indexOf(o) < 0);
		__getNodeExtendData(o).isSelected = true;
		if (o instanceof PIXI.Sprite) {
			o.filters = selectedFilters;
		}
		this.push(o);
	}
	
	remove(o) {
		assert(__getNodeExtendData(o).isSelected);
		var i = this.indexOf(o);
		assert(i >= 0);
		__getNodeExtendData(o).isSelected = false;
		if (o instanceof PIXI.Sprite) {
			o.filters = null;
		}
		this.splice(i, 1);
	}
}

export default Selection;

const selectionFilter = new PIXI.filters.OutlineFilter(2, 0xffff00);
const selectedFilters = [selectionFilter];

setInterval(() => {
	if (EDITOR.selection.length > 0) {
		selectionFilter.color ^= 0x063311;
	}
}, 1000 / 60 * 3);

//save/load selection

var getPathOfNode = (node) => {
	var ret = [];
	while (node !== game.stage) {
		ret.push(node.parent.getChildIndex(node));
		node = node.parent;
	}
	return ret;
}

var selectNodeByPath = (path, nodeNum) => {
	var ret = game.stage;
	for (var i = path.length - 1; i >= 0; i--) {
		ret = ret.getChildAt(path[i]);
	}
	if (nodeNum === 0) {
		EDITOR.ui.sceneTree.selectInTree(ret);
	} else {
		EDITOR.selection.add(ret);
	}
}


//-------- sorting selection --------------------------------
var curDeepness;

var recalculateNodesDeepness = () => {
	curDeepness = 0;
	recalculateNodesDeepnessRecursive(game.stage);
}

var recalculateNodesDeepnessRecursive = (n) => {
	__getNodeExtendData(n).deepness = curDeepness++;
	if (n.hasOwnProperty('children')) {
		n.children.some(recalculateNodesDeepnessRecursive);
	}
}

var sortByDeepness = (a, b) => {
	return __getNodeExtendData(a).deepness - __getNodeExtendData(b).deepness;
}

