import TreeNode from './tree-node.js';
import Window from '../window.js';

var classViewProps = {className: 'vertical-layout'};
var leftPanelProps = {className: 'left-panel'};

R.renderSceneNode = (node) => {
	return React.createElement(TreeNode, {node: node, key: __getNodeExtendData(node).id});
}

function onEmptyClick() {
	editor.selection.clearSelection(true);
}

export default class TreeView extends React.Component {
	
	constructor (props) {
		super(props);
		this.selectInTree = this.selectInTree.bind(this);
		this.onCopyClick = this.onCopyClick.bind(this);
		this.onCutClick = this.onCutClick.bind(this);
		this.onDeleteClick = this.onDeleteClick.bind(this);
		this.onBringUpClick = this.onBringUpClick.bind(this);
		this.onMoveUpClick = this.onMoveUpClick.bind(this);
		this.onMoveDownClick = this.onMoveDownClick.bind(this);
		this.onBringDownClick = this.onBringDownClick.bind(this);
	}
	
	selectInTree(node, add) {
		assert(node, "Attempt to select in tree emty node");
		var n = node;
		while (n && n.parent) {
			__getNodeExtendData(n).toggled = true;
			n = n.parent;
		}
		editor.selection.select(node, add === true);
		setTimeout(() => {
			var e = $('.scene-tree-view .item-selected');
			if (e[0]) {
				Window.bringWindowForward(e.closest('.window-body'));
				e[0].scrollIntoView({});
			}
		}, 1);
	}

	onDeleteClick() {
		if((editor.selection.length > 0) && (editor.selection[0] !== game.currentContainer)) {
			var p = editor.selection[0].parent;
			var i = p.getChildIndex(editor.selection[0]);

			var a = editor.selection.slice(0);
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
			
			var added = [];
			editor.clipboardData.some((data) => {
				var o = Lib._deserializeObject(data);
				added.push(o);
				editor.attachToSelected(o, true);
			});
			editor.selection.clearSelection();
			while (added.length > 0) {
				editor.selection.add(added.shift());
			}
			editor.refreshTreeViewAndPropertyEditor();
			editor.sceneModified(true);
		}
	}
	
	onBringUpClick() {
		var i = 0;
		while(this.onMoveUpClick(true) && i++ < 100000);
		editor.sceneModified(true);
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	onMoveUpClick(dontSaveHistoryState) {
		var ret = false;
		
		editor.selection.some((o) => {
			if(o.parent !== game.stage) {
				var i = o.parent.getChildIndex(o);
				if (i > 0) {
					var upper = o.parent.getChildAt(i - 1);
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
		var ret = false;
		var a = editor.selection.slice(0);
		a.reverse();
		a.some((o) => {
			if(o.parent !== game.stage) {
				var i = o.parent.getChildIndex(o);
				if(i < (o.parent.children.length - 1)) {
					var lower = o.parent.getChildAt(i + 1);
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
		var i = 0;
		while(this.onMoveDownClick(true) && i++ < 100000);
		editor.sceneModified(true);
		editor.refreshTreeViewAndPropertyEditor();
	}
	
	render() {
		if (!editor.game) return R.spinner();
		
		var isEmpty = editor.selection.length === 0;
		
		return R.div(classViewProps,
			R.div(leftPanelProps,
				R.btn(R.icon('bring-up'), this.onBringUpClick, 'Bring selected up', "tool-btn", undefined, isEmpty),
				R.btn(R.icon('move-up'), this.onMoveUpClick, 'Move selected up', "tool-btn", undefined, isEmpty),
				R.btn(R.icon('move-down'), this.onMoveDownClick, 'Move selected down', "tool-btn", undefined, isEmpty),
				R.btn(R.icon('bring-down'), this.onBringDownClick, 'Bring selected down', "tool-btn", undefined, isEmpty),
				R.hr(),
				R.btn(R.icon('copy'), this.onCopyClick, 'Copy selected in to clipboard (Ctrl+C)', "tool-btn", 1067, isEmpty),
				R.btn(R.icon('cut'), this.onCutClick, 'Cut selected (Ctrl+X)', "tool-btn", 1088, isEmpty),
				R.btn(R.icon('paste'), this.onPasteClick, 'Paste (Ctrl+V)', "tool-btn", 1086, editor.clipboardData == null),
				R.hr(),
				R.btn(R.icon('delete'), this.onDeleteClick, 'Remove selected', "tool-btn", 46, isEmpty)
	
	),
			R.div({className: 'scene-tree-view', onClick: onEmptyClick},
				game.__getScenesStack().map(renderSceneStackItem),
				editor.game.stage.children.map(renderRoots)
			)
		);
	}
}

const renderRoots = (node, i) => {
	if(node === game.currentContainer) {
		return R.renderSceneNode(node);
	} else {
		var style;
		if(__getNodeExtendData(node).hidden) {
			style = {display:'none'};
		}
		return R.div({className:'inactive-scene-item', style, key:'na-' + i, title:'This scene node is blocked by modal object for now.'}, R.classIcon(node.constructor), R.b(null, node.name), ' (' + node.constructor.name + ')');
	}
}

const renderSceneStackItem = (s, i) => {
	return R.div({className:'stacked-scene-item', title: 'This scene currently in stack.', key: i},
		R.classIcon(s.constructor), s.name, '(' + s.constructor.name + ') #' +  __getNodeExtendData(s).id
	);
}