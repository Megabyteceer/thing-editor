import { Container } from "pixi.js";
import { ClassAttributes, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import showContextMenu from "thing-editor/src/editor/ui/context-menu";
import { editorUtils } from "thing-editor/src/editor/utils/delete.selected";
import sp from "thing-editor/src/editor/utils/stop-propagation";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

let caretClosed = R.span({ className: 'tree-caret' }, '▸');
let caretOpened = R.span({ className: 'tree-caret' }, '▾');

let lastClickedItem: TreeNode | null;

interface TreeNodeProps extends ClassAttributes<TreeNode> {
	node: Container;

}

interface TreeNodeState {

}

class TreeNode extends ComponentDebounced<TreeNodeProps, TreeNodeState> {

	constructor(props: TreeNodeProps) {
		super(props);

		this.onMouseDown = this.onMouseDown.bind(this);
	}

	onMouseDown(ev: PointerEvent) { // == select nodes
		sp(ev);

		let state = this.props.node.__nodeExtendData;
		if(ev.buttons !== 1 && state.isSelected) {
			return;
		}

		if((isClickedAtRightEdge(ev)) && nodeHasChildren(this.props.node)) {
			state.childrenExpanded = !state.childrenExpanded;
			if(!state.childrenExpanded) {
				collapseChildrenRecursively(this.props.node);
			} else if(ev.altKey) {
				expandChildrenRecursively(this.props.node);
			}
			this.refresh();
			return;
		}

		if(ev.shiftKey && lastClickedItem && (lastClickedItem.props.node.parent === this.props.node.parent)) {
			let p = this.props.node.parent;
			let i1 = p.getChildIndex(lastClickedItem.props.node);
			let i2 = p.getChildIndex(this.props.node);
			let from = Math.min(i1, i2);
			let to = Math.max(i1, i2);
			while(from <= to) {
				let n = p.getChildAt(from) as Container;
				if(n !== lastClickedItem.props.node) {
					game.editor.selection.select(n, true);
				}
				from++;
			}
		} else {
			game.editor.selection.select(this.props.node, ev.ctrlKey);
		}

		if(state.isSelected) {
			lastClickedItem = this;
		}
		if(document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
	}

	static clearLastClicked() {
		lastClickedItem = null;
	}

	render() {
		let node = this.props.node;
		let state = node.__nodeExtendData;
		let children;
		let caret;
		if(nodeHasChildren(node) && !state.hideAllChildren) {
			if(state.childrenExpanded) {
				caret = caretOpened;
				children = R.div({ className: 'tree-children' },
					node.children.map(renderSceneNode as any)
				);
			} else {
				caret = caretClosed;
			}
		}
		let className = 'tree-item';

		if(state.isSelected) {
			if(!lastClickedItem) {
				lastClickedItem = this;
			}
			className += ' item-selected';
		}

		let style;
		if(state.hidden) {
			style = { display: 'none' };
		}

		return R.fragment(R.div({
			onDblClick: (ev: PointerEvent) => {
				if(!isClickedAtRightEdge(ev) && !ev.ctrlKey) {
					game.editor.editClassSource(node);
				}
			},
			onContextMenu: (ev: PointerEvent) => {
				onContextMenu(node, ev);
			},
			className,
			style,
			onMouseDown: this.onMouseDown
		}, R.sceneNode(node), caret), children);
	}
}


const onContextMenu = (node: Container, ev: PointerEvent) => {
	if(node.__nodeExtendData.isSelected) {
		sp(ev);
	}

	showContextMenu([
		{
			name: "Delete selected",
			onClick: editorUtils.deleteSelected,
			disabled: (game.editor.selection.length === 1) && (game.editor.selection[0] === game.currentContainer)
		}
	], ev)
};

function nodeHasChildren(node: Container) {
	return node.children.length > 0 && !node.__hideChildren;
}

function isClickedAtRightEdge(ev: PointerEvent) {
	let b = ((ev.currentTarget as HTMLElement).closest('.scene-tree-view') as HTMLElement).getBoundingClientRect();
	return (b.right - ev.clientX) < 40;
}

function collapseChildrenRecursively(node: Container) {
	node.__nodeExtendData.childrenExpanded = false;
	if(node.hasOwnProperty('children')) {
		node.children.some(collapseChildrenRecursively as any);
	}
}

function expandChildrenRecursively(node: Container) {
	node.__nodeExtendData.childrenExpanded = true;
	if(node.hasOwnProperty('children')) {
		node.children.some(expandChildrenRecursively as any);
	}
}

export default TreeNode;

const renderSceneNode = (node: Container) => {
	if(node.__nodeExtendData.hidden) {
		return;
	}
	assert(typeof node.___id === 'number', "scene object without ___id detected.", 40902);
	return h(TreeNode, { node: node, key: node.___id });
};

export { renderSceneNode };
