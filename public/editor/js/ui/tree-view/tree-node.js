let caretClosed = R.span({className: 'tree-caret'}, '▸');
let caretOpened = R.span({className: 'tree-caret'}, '▾');

let nameProps = {className: 'scene-node-name'};
let classProps = {className: 'scene-node-class'};

let lastClickedItem;

class TreeNode extends React.Component {
	
	constructor(props) {
		super(props);
		
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	onMouseDown(ev) { // == select nodes
		let state = __getNodeExtendData(this.props.node);
		if(!ev.ctrlKey && (state.isSelected || isClickedAtRightEdge(ev)) && nodeHasChildren(this.props.node)) {
			state.toggled = !state.toggled;
			if(!state.toggled) {
				collapseChildsRecursively(this.props.node);
			}
			this.forceUpdate();
			sp(ev);
			return;
		}
		
		if(ev.shiftKey && lastClickedItem && (lastClickedItem.props.node.parent === this.props.node.parent)) {
			let p = this.props.node.parent;
			let i1 = p.getChildIndex(lastClickedItem.props.node);
			let i2 = p.getChildIndex(this.props.node);
			let from = Math.min(i1, i2);
			let to = Math.max(i1, i2);
			while(from <= to) {
				let n = p.getChildAt(from);
				if(n !== lastClickedItem.props.node) {
					editor.selection.select(n, true);
				}
				from++;
			}
		} else {
			editor.selection.select(this.props.node, ev.ctrlKey);
		}
		
		if(state.isSelected) {
			lastClickedItem = this;
		}
		if(document.activeElement) {
			document.activeElement.blur();
		}
		sp(ev);
	}
	
	render() {
		let node = this.props.node;
		let state = __getNodeExtendData(node);
		let childs;
		let caret;
		if(nodeHasChildren(node)) {
			if(state.toggled) {
				caret = caretOpened;
				childs = R.div({className: 'tree-childs'},
					node.children.map(R.renderSceneNode)
				);
			} else {
				caret = caretClosed;
			}
		}
		let className = 'list-item';
		
		if(state.isSelected) {
			className += ' item-selected';
		}
		let icon = R.classIcon(node.constructor);
		
		let style;
		if(node.children.length > 6) {
			let p = node.children.length / 2;
			style = {
				paddingTop: p,
				paddingBottom: p
			};
		}
		
		if(__getNodeExtendData(node).hidden) {
			style = {display: 'none'};
		}
		
		return R.fragment(R.div({
			className,
			style,
			onMouseDown: this.onMouseDown
		}, icon, R.span(nameProps, node.name), R.span(classProps, ' (' + node.constructor.name + ') #' + __getNodeExtendData(node).id), caret), childs);
	}
}

function nodeHasChildren(node) {
	return node.children && node.children.length > 0;
}

function isClickedAtRightEdge(ev) {
	let b = $(ev.currentTarget).closest('.scene-tree-view')[0].getBoundingClientRect();
	return (b.right - ev.clientX) < 40;
}

function collapseChildsRecursively(node) {
	__getNodeExtendData(node).toggled = false;
	if(node.hasOwnProperty('children')) {
		node.children.some(collapseChildsRecursively);
	}
}

export default TreeNode;