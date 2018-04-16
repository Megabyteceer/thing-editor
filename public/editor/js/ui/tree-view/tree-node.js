var caretClosed = R.span({className:'tree-caret'}, '▸');
var caretOpened = R.span({className:'tree-caret'}, '▾');

var nameProps = {className:'scene-node-name'};
var classProps = {className:'scene-node-class'};

var lastClickedItem;

class TreeNode extends React.Component {

    constructor(props) {
        super(props);

        this.onMouseDown = this.onMouseDown.bind(this);
    }
    
    onMouseDown(e) { // == select nodes
        var state = this.props.node.__editorData;
        if(!e.ctrlKey) {
            state.toggled = !state.toggled;
        }

        if(e.shiftKey && lastClickedItem && (lastClickedItem.props.node.parent === this.props.node.parent)) {
            var p = this.props.node.parent;
            var i1 = p.getChildIndex(lastClickedItem.props.node);
            var i2 = p.getChildIndex(this.props.node);
            var from = Math.min(i1, i2);
            var to = Math.max(i1, i2);
            while(from <= to) {
                var n = p.getChildAt(from);
                if(n !== lastClickedItem.props.node) {
                    EDITOR.selection.select(n, true);
                }
                from++;
            }
        } else {
            EDITOR.selection.select(this.props.node, e.ctrlKey);
        }

         if(state.isSelected) {
            lastClickedItem = this;
        }

        e.stopPropagation();
    }

    render () {
        var node = this.props.node;
        var state = node.__editorData;
        var childs;
        var caret;
        if(node.children && node.children.length > 0) {
            if(state.toggled) {
                caret = caretOpened;
                childs = R.div({className:'tree-childs'},
                    node.children.map(R.renderSceneNode)
                );
            } else {
                caret = caretClosed;

            }
        }
        var className = 'scene-tree-item';

        if(state.isSelected) {
            className += ' scene-tree-item-selected';
        }
        var icon = R.icon(node.constructor.EDITOR_icon || 'tree/game-obj');
        return R.div(null, R.div({className, onMouseDown:this.onMouseDown}, caret, icon, R.span(nameProps, node.name), R.span(classProps,' (' + node.constructor.name + ')')), childs);
    }

}

export default TreeNode;