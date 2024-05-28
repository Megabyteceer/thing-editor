import type { Container } from 'pixi.js';
import type { ClassAttributes } from 'preact';
import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import showContextMenu from 'thing-editor/src/editor/ui/context-menu';
import { TREE_NODE_CONTEXT_MENU } from 'thing-editor/src/editor/ui/tree-view/tree-node-context-menu';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

let caretClosed = R.img({ className: 'tree-caret', src: '/thing-editor/img/caret.png' });
let caretOpened = R.img({ className: 'tree-caret', src: '/thing-editor/img/caret-open.png' });

let lastClickedItem: TreeNode | null;

interface TreeNodeProps extends ClassAttributes<TreeNode> {
	node: Container;

}

class TreeNode extends ComponentDebounced<TreeNodeProps> {

	constructor(props: TreeNodeProps) {
		super(props);

		this.onClick = this.onClick.bind(this);
	}

	onClick(ev: PointerEvent) { // == select nodes
		sp(ev);

		window.getSelection()?.empty();

		let extendData = this.props.node.__nodeExtendData;

		if (extendData.treeNodeView !== this) { // object was removed but tree is outdated yet
			return;
		}

		if ((isClickedAtRightEdge(ev)) && nodeHasExpandableChildren(this.props.node)) {
			extendData.childrenExpanded = !extendData.childrenExpanded;
			if (!extendData.childrenExpanded) {
				collapseChildrenRecursively(this.props.node);
			} else if (ev.altKey) {
				expandChildrenRecursively(this.props.node);
			}
			this.refresh();
			return;
		}

		if (ev.shiftKey && lastClickedItem && (lastClickedItem.props.node.parent === this.props.node.parent)) {
			let p = this.props.node.parent;
			let i1 = p.getChildIndex(lastClickedItem.props.node);
			let i2 = p.getChildIndex(this.props.node);
			let from = Math.min(i1, i2);
			let to = Math.max(i1, i2);
			while (from <= to) {
				let n = p.getChildAt(from) as Container;
				if (n !== lastClickedItem.props.node) {
					game.editor.selection.select(n, true);
				}
				from++;
			}
		} else {
			game.editor.selection.select(this.props.node, ev.ctrlKey);
		}

		if (extendData.isSelected) {
			lastClickedItem = this;
		}
		game.editor.blurPropsInputs();
	}

	static clearLastClicked() {
		lastClickedItem = null;
	}

	render() {
		let node = this.props.node;
		let extendData = node.__nodeExtendData;
		extendData.treeNodeView = this;
		let children;
		let caret;
		if (nodeHasExpandableChildren(node)) {
			if (extendData.childrenExpanded) {
				caret = caretOpened;
				children = R.div({ className: 'tree-children' },
					node.children.map(renderSceneNode as any)
				);
			} else {
				caret = caretClosed;
			}
		}
		let className = 'tree-item';

		if (extendData.isSelected) {
			if (!lastClickedItem) {
				lastClickedItem = this;
			}
			className += ' item-selected';
		}

		if (extendData.isPrefabReference) {
			className += (extendData.unknownPrefab ? ' item-prefab-reference-unknown' : ' item-prefab-reference');
		}

		let style;
		if (extendData.hidden || extendData.isolate) {
			style = { display: 'none' };
		}

		return R.fragment(R.div({
			onDblClick: (ev: PointerEvent) => {
				if (!isClickedAtRightEdge(ev) && !ev.ctrlKey) {
					game.editor.editClassSource(node);
				}
			},
			onContextMenu: (ev: PointerEvent) => {
				onContextMenu(node, ev);
			},
			className,
			style,
			onClick: this.onClick,
			onDragStart(ev: DragEvent) {
				selectIfNotSelected(node);
				ev.dataTransfer!.setData('text/drag-thing-editor-tree-selection', '');
			},
			draggable: node.parent !== game.stage
		}, R.sceneNode(node), caret), children);
	}
}


const selectIfNotSelected = (node: Container) => {
	if (game.editor.selection.indexOf(node) < 0) {
		game.editor.selection.select(node);
	}
};

const onContextMenu = (node: Container, ev: PointerEvent) => {

	selectIfNotSelected(node);

	sp(ev);
	showContextMenu(TREE_NODE_CONTEXT_MENU, ev);
};

const isNodeVisibleInTree = (node: Container) => {
	return !node.__nodeExtendData.hidden;
};

function nodeHasExpandableChildren(node: Container) {
	return node.children.some(isNodeVisibleInTree) && !node.__hideChildren;
}

function isClickedAtRightEdge(ev: PointerEvent) {
	let b = ((ev.currentTarget as HTMLElement).closest('.scene-tree-view') as HTMLElement).getBoundingClientRect();
	return (b.right - ev.clientX) < 40;
}

function collapseChildrenRecursively(node: Container) {
	node.__nodeExtendData.childrenExpanded = false;
	if (node.hasOwnProperty('children')) {
		node.children.some(collapseChildrenRecursively as any);
	}
}

function expandChildrenRecursively(node: Container) {
	node.__nodeExtendData.childrenExpanded = true;
	if (node.hasOwnProperty('children')) {
		node.children.some(expandChildrenRecursively as any);
	}
}

export default TreeNode;

const renderSceneNode = (node: Container) => {
	if (node.__nodeExtendData.hidden) {
		return;
	}
	assert(typeof node.___id === 'number', 'scene object without ___id detected.', 40902);
	return h(TreeNode, { node: node, key: node.___id });
};

export { renderSceneNode };

