import Window from './window.js';
import TreeView from './tree-view/tree-view.js'
import Viewport from './viewport.js';
import PropsEditor from './props-editor/props-editor.js';
import Button from './button.js';

R.btn = function(label, onClick, className, toggledLabel, hotkey){
	return React.createElement(Button, {label, onClick, className, toggledLabel, hotkey});
}

function window(id, title, content, x, y, minW, minH, w, h) {
	return React.createElement(Window, {id, title, content, x, y, minW, minH, w, h});
}

class UI extends React.Component {
	
	constructor (props) {
		super(props);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
	}

	componentDidMount() {
		this.props.onMounted(this);
	}

	sceneTreeRef(sceneTree) {
		this.sceneTree = sceneTree;
	}
	
	render() {
		return R.div(null,
			window('sceneTree', 'Scene tree', React.createElement(TreeView, {ref: this.sceneTreeRef}), 0, 0, 250, 250, 250, 500),
			window('viewport', 'Viewport', React.createElement(Viewport), 1000, 0, 840, 480, 840, 480),
			window('propsEditor', 'Properties', React.createElement(PropsEditor), 250, 0, 250, 250, 250, 500)
		
		);
	}
}
export default UI;