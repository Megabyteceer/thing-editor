class Selection extends Array {

    select(object, add) {
		if(!add) {
			this.clear();
		}
		if(object.__editorData.isSelected) {
			this.remove(object);
		} else {
			this.add(object);
		}
		this.sortSelectedNodes();
		EDITOR.refreshTreeViewAndPropertyEditor();
	}

	sortSelectedNodes() {
		this.some(calculateNodeDeepness);
		this.sort(sortByDeepness);
	}

	clear() {
		while(this.length > 0) {
			this.remove(this[this.length -1]);
		}
	}
	
	add(o) {
		assert(!o.__editorData.isSelected);
		assert(this.indexOf(o) < 0);
		o.__editorData.isSelected = true;
		this.push(o);
	}

	remove(o) {
		assert(o.__editorData.isSelected);
		var i = this.indexOf(o);
		assert(i >= 0);
		o.__editorData.isSelected = false;
		this.splice(i, 1);
	}
}

var calculateNodeDeepness = (node) => {
	var a = [];
	var n = node;
	var p = n.parent;
	while(p) {
		a.push[p.getChildIndex(n)];
		n = p;
		p = p.parent;
	}
	var ret = 0;
	var currentLevel = 999999999999.9;
	while(a.length > 0) {
		ret += currentLevel * a.pop();
		currentLevel /= 500.0;
	}
	node.__editorData.deepness = ret;
}

var sortByDeepness = (a,b) {
	return a.deepness - b.deepness;
}

export default Selection;