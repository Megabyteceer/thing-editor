import TreeNode from './tree-node.js';


R.renderSceneNode = (node) => {
 return React.createElement(TreeNode, {node: node, key:node.__editorData.id});
    
}

class TreeView extends React.Component {

    render () {
        if(!EDITOR.game) return R.spinner();
        
        return R.div({className:'scene-tree-view'},
            EDITOR.game.stage.children.map(R.renderSceneNode)
        );
    }

}

export default TreeView;