import TreeNode from './tree-node.js';
import Window from '../window.js';

R.renderSceneNode = (node) => {
	return React.createElement(TreeNode, {node: node, key: __getNodeExtendData(node).id});
}

function onEmptyClick() {
	editor.selection.clearSelection(true);
}

class TreeView extends React.Component {
	
	selectInTree(node) {
		assert(node, "Attempt to select in tree emty node");
		var n = node;
		while (n && n.parent) {
			__getNodeExtendData(n).toggled = true;
			n = n.parent;
		}
		editor.selection.select(node);
		setTimeout(() => {
			var e = $('.scene-tree-view .item-selected');
			if (e[0]) {
				Window.bringWindowForward(e.closest('.window-body'));
				e[0].scrollIntoView({});
			}
		}, 1);
	}
	
	render() {
		if (!editor.game) return R.spinner();
		
		return R.div({className: 'scene-tree-view', onClick: onEmptyClick},
			editor.game.stage.children.map(renderRoots)
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

export default TreeView;