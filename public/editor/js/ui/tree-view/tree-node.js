var caretClosed = R.span({className: 'tree-caret'}, '▸');
var caretOpened = R.span({className: 'tree-caret'}, '▾');

var nameProps = {className: 'scene-node-name'};
var classProps = {className: 'scene-node-class'};

var lastClickedItem;

class TreeNode extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.onClick = this.onClick.bind(this);
	}
	
	onClick(e) { // == select nodes
		var state = this.props.node.__editorData;
		if (!e.ctrlKey && (state.isSelected || isClickedAtRightEdge(e))) {
			state.toggled = !state.toggled;
			if (!state.toggled) {
				collapseChildsRecursively(this.props.node);
			}
			this.forceUpdate();
			return;
		}
		
		if (e.shiftKey && lastClickedItem && (lastClickedItem.props.node.parent === this.props.node.parent)) {
			var p = this.props.node.parent;
			var i1 = p.getChildIndex(lastClickedItem.props.node);
			var i2 = p.getChildIndex(this.props.node);
			var from = Math.min(i1, i2);
			var to = Math.max(i1, i2);
			while (from <= to) {
				var n = p.getChildAt(from);
				if (n !== lastClickedItem.props.node) {
					EDITOR.selection.select(n, true);
				}
				from++;
			}
		} else {
			EDITOR.selection.select(this.props.node, e.ctrlKey);
		}
		
		if (state.isSelected) {
			lastClickedItem = this;
		}
		
		e.stopPropagation();
	}
	
	render() {
		var node = this.props.node;
		var state = node.__editorData;
		var childs;
		var caret;
		if (node.children && node.children.length > 0) {
			if (state.toggled) {
				caret = caretOpened;
				childs = R.div({className: 'tree-childs'},
					node.children.map(R.renderSceneNode)
				);
			} else {
				caret = caretClosed;
			}
		}
		var className = 'list-item';
		
		if (state.isSelected) {
			className += ' item-selected';
		}
		var icon = R.classIcon(node.constructor);
		return R.div(null, R.div({
			className,
			onClick: this.onClick
		}, icon, R.span(nameProps, node.name), R.span(classProps, ' (' + node.constructor.name + ') #' + state.id), caret), childs);
	}
	
}

function isClickedAtRightEdge(e) {
	var b = $(e.currentTarget).closest('.scene-tree-view')[0].getBoundingClientRect();
	return (b.right - e.clientX) < 40;
}

function collapseChildsRecursively(node) {
	node.__editorData.toggled = false;
	if (node.hasOwnProperty('children')) {
		node.children.some(collapseChildsRecursively);
	}
}

export default TreeNode;