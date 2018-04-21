import Window from './window.js';
import TreeView from './tree-view/tree-view.js'
import Viewport from './viewport.js';
import PropsEditor from './props-editor/props-editor.js';
import Button from './button.js';
import Modal from './modal.js';
import ClessesView from './classes-view.js';
import ScenesList from "./scenes-list.js";

R.btn = function (label, onClick, title, className, hotkey) {
	className = className || '';
	return React.createElement(Button, {label, onClick, className, title, hotkey});
}

function window(id, title, content, x, y, minW, minH, w, h) {
	return React.createElement(Window, {id, title, content, x, y, minW, minH, w, h});
}

class UI extends React.Component {
	
	constructor(props) {
		super(props);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
		this.propsEditorRef = this.propsEditorRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.modalRef = this.modalRef.bind(this);
	}
	
	componentDidMount() {
		this.props.onMounted(this);
	}
	
	sceneTreeRef(sceneTree) {
		this.sceneTree = sceneTree;
	}
	
	viewportRef(viewport) {
		this.viewport = viewport;
	}
	
	propsEditorRef(propsEditor) {
		this.propsEditor = propsEditor;
	}
	
	modalRef(modal) {
		this.modal = modal;
	}
	
	render() {
		return R.div(null,
			R.btn('Open project...', EDITOR.fs.chooseProject),
			window('sceneTree', 'Scene tree', React.createElement(TreeView, {ref: this.sceneTreeRef}), 0, 0, 250, 250, 250, 500),
			window('viewport', 'Viewport', React.createElement(Viewport, {ref: this.viewportRef}), 1000, 0, 448, 223, 840, 480),
			window('propsEditor', 'Properties', React.createElement(PropsEditor, {
				ref: this.propsEditorRef,
				onChange: EDITOR.onSelectedPropsChange
			}), 250, 0, 250, 250, 250, 500),
			window('classesLib', 'Classes', React.createElement(ClessesView), 0, 1000, 250, 150, 250, 500),
			window('scenesList', 'Scenes', React.createElement(ScenesList), 1000, 1000, 200, 100, 200, 100),
			
			
			React.createElement(Modal, {ref: this.modalRef})
		);
	}
}

export default UI;