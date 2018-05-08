import Window from './window.js';
import TreeView from './tree-view/tree-view.js'
import Viewport from './viewport.js';
import PropsEditor from './props-editor/props-editor.js';
import Button from './button.js';
import Modal from './modal/modal.js';
import ClessesView from './classes-view.js';
import ScenesList from "./scenes-list.js";
import PrefabsList from "./prefabs-list.js";

/**
 *
 * @param label
 * @param onClick
 * @param title
 * @param className
 * @param hotkey
 * @returns {Element}
 */
R.btn = function (label, onClick, title, className, hotkey, disabled) {
	className = className || '';
	return React.createElement(Button, {label, onClick, className, title, hotkey, disabled});
}

function renderWindow(id, title, content, x, y, minW, minH, w, h) {
	return React.createElement(Window, {id, title, content, x, y, minW, minH, w, h});
}

class UI extends React.Component {
	
	
	constructor(props) {
		super(props);
		
		this.renderWindow = renderWindow;
		
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
		this.propsEditorRef = this.propsEditorRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.modalRef = this.modalRef.bind(this);
		this.prefabsRef = this.prefabsRef.bind(this);
		this.scenesStackRef = this.scenesStackRef.bind(this);
		this.classesListRef = this.classesListRef.bind(this);
	}
	
	componentDidMount() {
		this.props.onMounted(this);
	}
	
	sceneTreeRef(ref) {
		this.sceneTree = ref;
	}
	
	classesListRef(ref) {
		this.classesList = ref;
	}

    prefabsRef(ref) {
		this.prefabsList = ref;
	}
	
	scenesStackRef(ref) {
		this.scenesStack = ref;
	}
	
	viewportRef(ref) {
		this.viewport = ref;
	}
	
	/**
	 * @param ref {PropsEditor}
	 */
	propsEditorRef(ref) {
		this.propsEditor = ref;
	}
	
	modalRef(ref) {
		this.modal = ref;
	}
	
	render() {
		return R.div(null,
			R.btn('Open project...', editor.fs.chooseProject),
			editor.history.buttonsRenderer(),
			renderWindow('sceneTree', 'Scene tree', React.createElement(TreeView, {ref: this.sceneTreeRef}), 0, 0, 250, 330, 250, 500),
			renderWindow('viewport', R.span(null, 'Viewport: ', editor.projectDesc ? R.b(null, editor.projectDesc.currentSceneName) : undefined), React.createElement(Viewport, {ref: this.viewportRef}), 1000, 0, 420, 313, 840, 480),
			renderWindow('propsEditor', 'Properties', React.createElement(PropsEditor, {
				ref: this.propsEditorRef,
				onChange: editor.onSelectedPropsChange
			}), 250, 0, 250, 250, 250, 500),
			renderWindow('classesLib', 'Classes', React.createElement(ClessesView, {ref: this.classesListRef}), 0, 1000, 250, 150, 250, 500),
			renderWindow('prefabsList', 'Prefabs', React.createElement(PrefabsList, {ref: this.prefabsRef}), 250, 1000, 250, 150, 250, 500),
			renderWindow('scenesList', 'Scenes', React.createElement(ScenesList), 1000, 1000, 200, 100, 200, 100),
			
			React.createElement(Modal, {ref: this.modalRef})
		);
	}
}

export default UI;