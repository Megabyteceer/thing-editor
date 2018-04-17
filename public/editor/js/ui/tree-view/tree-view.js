import TreeNode from './tree-node.js';


R.renderSceneNode = (node) => {
 return React.createElement(TreeNode, {node: node, key:node.__editorData.id});
    
}

class TreeView extends React.Component {

    select(node) {
        var n = node;
        while(n && n.parent) {
            n.__editorData.toggled = true;
            n = n.parent;
        }
        EDITOR.selection.select(node);
        setTimeout(() => {
            $('.scene-tree-view .item-selected')[0].scrollIntoView({});
        },0);
    }

    render () {
        if(!EDITOR.game) return R.spinner();
        
        return R.div({className:'scene-tree-view'},
            EDITOR.game.stage.children.map(R.renderSceneNode)
        );
    }

}

export default TreeView;