import TreeNode from './tree-node.js';
import Window from '../window.js';

R.renderSceneNode = (node) => {
	return React.createElement(TreeNode, {node: node, key: __getNodeExtendData(node).id});
}

function onEmptyClick() {
	EDITOR.selection.clearSelection(true);
}

class TreeView extends React.Component {
	
	selectInTree(node) {
		assert(node, "Attempt to select in tree emty node");
		var n = node;
		while (n && n.parent) {
			__getNodeExtendData(n).toggled = true;
			n = n.parent;
		}
		EDITOR.selection.select(node);
		setTimeout(() => {
			var e = $('.scene-tree-view .item-selected');
			if (e[0]) {
				Window.bringWindowForward(e.closest('.window-body'));
				e[0].scrollIntoView({});
			}
		}, 1);
	}
	
	render() {
		if (!EDITOR.game) return R.spinner();
		
		return R.div({className: 'scene-tree-view', onClick: onEmptyClick},
			EDITOR.game.stage.children.map(R.renderSceneNode)
		);
	}
	
}

export default TreeView;