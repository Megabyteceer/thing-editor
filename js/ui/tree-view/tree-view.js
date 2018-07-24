import TreeNode from './tree-node.js';
import Window from '../window.js';
import game from "/thing-engine/js/game.js";
import Selection from "../../utils/selection.js";
import Lib from "/thing-engine/js/lib.js";
import Scene from '/thing-engine/js/components/scene.js';

let classViewProps = {className: 'vertical-layout'};
let leftPanelProps = {className: 'left-panel'};

let foundByWhichProperty;

R.renderSceneNode = (node) => {
	return React.createElement(TreeNode, {node: node, key: __getNodeExtendData(node).id});
};

function onEmptyClick(ev) {
	if(!window.isEventFocusOnInputElement(ev)) {
		editor.selection.clearSelection(true);
	}
}

export default class TreeView extends React.Component {
	
	constructor (props) {
		super(props);
		this.selectInTree = this.selectInTree.bind(this);
		this.onCopyClick = this.onCopyClick.bind(this);
		this.onCutClick = this.onCutClick.bind(this);
		this.onDeleteClick = this.onDeleteClick.bind(this);
		this.onUnwrapClick = this.onUnwrapClick.bind(this);
		this.onBringUpClick = this.onBringUpClick.bind(this);
		this.onMoveUpClick = this.onMoveUpClick.bind(this);
		this.onMoveDownClick = this.onMoveDownClick.bind(this);
		this.onBringDownClick = this.onBringDownClick.bind(this);
		this.onSearchKeyDown = this.onSearchKeyDown.bind(this);
		this.onSearchChange = this.onSearchChange.bind(this);
		this.fundNextBySearch = this.fundNextBySearch.bind(this);
		this.findNext = this.findNext.bind(this);
		this.searchString = editor.settings.getItem('tree-search', '');
	}
	
	selectInTree(node, add) {
		assert(node, "Attempt to select in tree empty node");
		let n = node;
		while (n && n.parent) {
			__getNodeExtendData(n).toggled = true;
			n = n.parent;
		}
		editor.selection.select(node, add === true);
		setTimeout(() => {
			
			if(foundByWhichProperty && foundByWhichProperty.has(node) && !add) {
				let fieldName = foundByWhichProperty.get(node);
				editor.ui.propsEditor.selecField(fieldName);
			}
			
			foundByWhichProperty = null;
			
			let e = $('.scene-tree-view .item-selected');
			if (e[0]) {
				Window.bringWindowForward(e.closest('.window-body'));
				e[0].scrollIntoView({});
				e.closest('.scene-tree-view').scrollLeft(0);
			}
		}, 1);
	}

	onDeleteClick() {
		if((editor.selection.length > 0) && (editor.selection[0] !== game.currentContainer)) {
			let p = editor.selection[0].parent;
			let i = p.getChildIndex(editor.selection[0]);

			let a = editor.selection.slice(0);
			editor.selection.clearSelection();

			a.some((o) => {
				o.remove();
			});
			
			
			if(i < p.children.length) {
				this.selectInTree(p.getChildAt(i));
			} else if(i > 0) {
				this.selectInTree(p.getChildAt(i - 1));
			} else if (p !== game.stage) {
				this.selectInTree(p);
			}
			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	}

	isCanBeUnwrapped() {
		if(editor.selection.length !== 1) {
			return;
		}
		let o = editor.selection[0];
		if(o === game.currentContainer) {
			return !(o instanceof Scene) && o.children && (o.children.length === 1);
		}
		return o.children && (o.children.length > 0);
	}

	onUnwrapClick() {
		if(this.isCanBeUnwrapped()) {
			let o = editor.selection[0];
			let parent = o.parent;
			let i = parent.getChildIndex(o);

			let isPrefab = (o === game.currentContainer);

			editor.selection.clearSelection();

			while(o.children.length > 0) {
				let c = o.getChildAt(o.children.length - 1);
				c.detachFromParent();

				parent.toLocal(c, o, c);

				if(isPrefab) {
					game.__setCurrentContainerContent(c);
				} else {
					parent.addChildAt(c, i);
				}
				
				c.rotation += o.rotation;
				this.selectInTree(c, true);
			}
			if(!isPrefab) {
				o.remove();
			}
			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	}
	
	onCopyClick() {
		if(editor.selection.length > 0) {
			editor.clipboardData = editor.selection.map(Lib.__serializeObject);
			editor.refreshTreeViewAndPropertyEditor();
		}
	}
	
	onCutClick() {
		this.onCopyClick();
		this.onDeleteClick();
	}
	
	onPasteClick() {
		if(editor.clipboardData && editor.clipboardData.length > 0) {
			editor.disableFieldsCache = true;
			let added = [];
			editor.clipboardData.some((data) => {
				let o = Lib._deserializeObject(data);
				added.push(o);
				editor.attachToSelected(o, true);
			});
			editor.selection.clearSelection();
			while (added.length > 0) {
				editor.selection.add(added.shift());
			}
			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
			editor.disableFieldsCache = false;
		}
	}
	
	onBringUpClick() {
		let i = 0;
		while(this.onMoveUpClick(true) && i++ < 100000); //moves selected object up until its become top
		editor.sceneModified(true);
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	onMoveUpClick(dontSaveHistoryState) {
		let ret = false;
		
		editor.selection.some((o) => {
			if(o.parent !== game.stage) {
				let i = o.parent.getChildIndex(o);
				if (i > 0) {
					let upper = o.parent.getChildAt(i - 1);
					if(!__getNodeExtendData(upper).isSelected) {
						o.parent.swapChildren(o, upper);
						ret = true;
					}
				}
			}
		});
		if(dontSaveHistoryState !== true) {
			editor.sceneModified(true);
			editor.refreshTreeViewAndPropertyEditor();
		}
		return ret;
	}
	
	onMoveDownClick(dontSaveHistoryState) {
		let ret = false;
		let a = editor.selection.slice(0);
		a.reverse();
		a.some((o) => {
			if(o.parent !== game.stage) {
				let i = o.parent.getChildIndex(o);
				if(i < (o.parent.children.length - 1)) {
					let lower = o.parent.getChildAt(i + 1);
					if(!__getNodeExtendData(lower).isSelected) {
						o.parent.swapChildren(o, lower);
						ret = true;
					}
				}
			}
		});
		if(dontSaveHistoryState !== true) {
			editor.sceneModified(true);
			editor.refreshTreeViewAndPropertyEditor();
		}
		return ret;
	}
	
	onBringDownClick() {
		let i = 0;
		while(this.onMoveDownClick(true) && i++ < 100000); //move selected element down until its become bottom.
		editor.sceneModified(true);
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	onSearchKeyDown(ev) {
		if(this.searchString && (ev.keyCode === 13)) {
			this.fundNextBySearch();
		}
	}
	
	onSearchChange(ev) {
		let val = ev.target.value.toLowerCase();
		let needSearch = this.searchString.length < val.length;
		this.searchString = val;
		editor.settings.setItem('tree-search', this.searchString);
		if(needSearch) {
			this.fundNextBySearch();
		}
	}
	
	fundNextBySearch() {
		foundByWhichProperty = new WeakMap();
		
		this.findNext((o) => {
			
			if(o.constructor.name.toLowerCase().indexOf(this.searchString) >= 0) return true;
			
			let props = editor.enumObjectsProperties(o);
			for(let p of props) {
				let val = '' + o[p.name];
				if(val.toLowerCase().indexOf(this.searchString) >= 0) {
					foundByWhichProperty.set(o, p.name);
					return true;
				}
			}
		}, 1);
	}
	
	findNext(condition, direction) {
		let a = new Selection();
		
		if(condition(game.currentContainer)) {
			a.push(game.currentContainer);
		}
		
		game.currentContainer.forAllChildren((o) => {
			if(condition(o)) {
				a.push(o);
			}
		});
		
		if (a.length > 0) {
			
			a.sortSelectedNodes();
			
			
			let i = a.indexOf(editor.selection[0]);
			if (i >= 0) {
				i += direction;
				if (i < 0) i = a.length - 1;
				if (i >= a.length) i = 0;
			} else {
				i = 0;
			}
			this.selectInTree(a[i]);
		} else {
			editor.selection.clearSelection(true);
		}
	}
	
	render() {
		if (!game.stage) return R.spinner();
		
		let isEmpty = editor.selection.length === 0;
		let isRoot = editor.selection.indexOf(game.currentContainer) >= 0;


		return R.div(classViewProps,
			R.div(leftPanelProps,
				R.btn(R.icon('bring-up'), this.onBringUpClick, 'Bring selected up', "tool-btn", undefined, isEmpty || isRoot),
				R.btn(R.icon('move-up'), this.onMoveUpClick, 'Move selected up', "tool-btn", undefined, isEmpty || isRoot),
				R.btn(R.icon('move-down'), this.onMoveDownClick, 'Move selected down', "tool-btn", undefined, isEmpty || isRoot),
				R.btn(R.icon('bring-down'), this.onBringDownClick, 'Bring selected down', "tool-btn", undefined, isEmpty || isRoot),
				R.hr(),
				R.btn(R.icon('copy'), this.onCopyClick, 'Copy selected in to clipboard (Ctrl+C)', "tool-btn", 1067, isEmpty),
				R.btn(R.icon('cut'), this.onCutClick, 'Cut selected (Ctrl+X)', "tool-btn", 1088, isEmpty || isRoot),
				R.btn(R.icon('paste'), this.onPasteClick, 'Paste (Ctrl+V)', "tool-btn", 1086, editor.clipboardData == null),
				R.hr(),
				R.btn(R.icon('delete'), this.onDeleteClick, 'Remove selected (Del)', "tool-btn", 46, isEmpty || isRoot),
				R.btn(R.icon('unwrap'), this.onUnwrapClick, 'Remove selected but keep children.', "tool-btn", undefined, !this.isCanBeUnwrapped())
	
			),
			R.div({className: 'scene-tree-view-wrap', onMouseDown: onEmptyClick},
				R.input({onKeyDown: this.onSearchKeyDown, onChange: this.onSearchChange, className:'tree-view-search', defaultValue: this.searchString, placeholder: 'Search'}),
				R.div({className: 'scene-tree-view', onMouseDown: onEmptyClick},
					game._getScenesStack().map(renderSceneStackItem),
					game.stage.children.map(renderRoots)
				)
			)
		);
	}
}

const renderRoots = (node, i) => {
	if(node === game.currentContainer) {
		return R.renderSceneNode(node);
	} else {
		let style;
		if(__getNodeExtendData(node).hidden) {
			style = {display:'none'};
		}
		return R.div({className:'inactive-scene-item', style, key:'na-' + i, title:'This scene node is blocked by modal object for now.'}, R.sceneNode(node));
	}
};

const renderSceneStackItem = (s, i) => {

	let body;
	if(typeof s === "string") {
		body = R.span(null, "waiting for instancing: " + s);
	} else {
		body = R.sceneNode(s);
	}


	return R.div({className:'stacked-scene-item', title: 'This scene currently in stack.', key: i},
		body
	);
};