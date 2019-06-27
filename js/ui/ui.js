import Window from './window.js';
import TreeView from './tree-view/tree-view.js';
import Viewport from './viewport.js';
import PropsEditor from './props-editor/props-editor.js';
import EditorButton from './editor-button.js';
import Modal from './modal/modal.js';
import ClassesView from './classes-view.js';
import ScenesList from "./scenes-list.js";
import PrefabsList from "./prefabs-list.js";
import LanguageView from "./language-view.js";
import Status from "./status.js";
import game from "thing-engine/js/game.js";
import SoundsList from './sounds-list.js';
import TexturesView from './textures-view.js';

/**
 *
 * @param label
 * @param onClick
 * @param title
 * @param className
 * @param hotkey
 * @param disabled
 * @returns {Element}
 */
R.btn = function (label, onClick, title = undefined, className = undefined, hotkey = false, disabled = false) {
	assert(onClick, "Function as onCLick handler expected.");
	className = className || '';
	return React.createElement(EditorButton, {label, onClick, className, title, hotkey, disabled});
};

function renderWindow(id, title, content, x, y, minW, minH, w, h, onResize) {
	return React.createElement(Window, {id, title, content, x, y, minW, minH, w, h, onResize});
}

class UI extends React.Component {
	
	
	constructor(props) {
		super(props);
		
		this.renderWindow = renderWindow;
		
		this.statusRef = this.statusRef.bind(this);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
		this.propsEditorRef = this.propsEditorRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.modalRef = this.modalRef.bind(this);
		this.prefabsRef = this.prefabsRef.bind(this);
		this.scenesStackRef = this.scenesStackRef.bind(this);
		this.classesListRef = this.classesListRef.bind(this);
		this.soundsListRef = this.soundsListRef.bind(this);
	}
	
	componentDidMount() {
		this.props.onMounted(this);
	}
	
	statusRef(ref) {
		this.status = ref;
	}
	
	sceneTreeRef(ref) {
		this.sceneTree = ref;
	}
	
	classesListRef(ref) {
		this.classesList = ref;
	}
	
	soundsListRef(ref) {
		this.soundsList = ref;
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
			R.btn('Build', editor.build),
			R.btn('Build debug', () => {editor.build(true);}),
			React.createElement(LanguageView),
			React.createElement(TexturesView),
			editor.history.buttonsRenderer(),
			R.btn('Project settings', editor.openProjectDescToEdit),

			renderWindow('sceneTree', 'Scene tree', React.createElement(TreeView, {ref: this.sceneTreeRef}), 0, 35, 250, 330, 250, 500),
			renderWindow('viewport', R.span(null, 'Viewport: ', editor.projectDesc ? R.b(null, editor.currentSceneName) : undefined, React.createElement(StatusBar)), React.createElement(Viewport, {ref: this.viewportRef}),
				558, 0, 470, 420, 1362, 742, ()=>{
					game._onContainerResize();
				}),
			renderWindow('propsEditor', 'Properties', React.createElement(PropsEditor, {
				ref: this.propsEditorRef,
				onChange: editor.onSelectedPropsChange
			}), 255, 35, 250, 250, 250, 500),
			renderWindow('classesLib', 'Classes', React.createElement(ClassesView, {ref: this.classesListRef}), 0, 550, 250, 150, 250, 470),
			renderWindow('prefabsList', 'Prefabs', React.createElement(PrefabsList, {ref: this.prefabsRef}), 255, 550, 250, 150, 250, 470),
			renderWindow('scenesList', 'Scenes', React.createElement(ScenesList), 1560, 750, 200, 100, 360, 260),
			renderWindow('soundsList', 'Sounds', React.createElement(SoundsList, {ref: this.soundsListRef}), 1194, 750, 200, 100, 360, 260),
			
			React.createElement(Status, {ref: this.statusRef}),
			React.createElement(Modal, {ref: this.modalRef})
		);
	}
}

export default UI;

class StatusBar extends React.Component {
	
	componentDidMount() {
		const f = () => {
			this.forceUpdate();
		};
		window.addEventListener('mousedown', f);
		window.addEventListener('mousemove', f);
		window.addEventListener('wheel', f);
	}

	render() {
		if(game && game.stage) {
			let txt = ' x: ' + game.mouse.__EDITOR_scene_x + ' y: ' + game.mouse.__EDITOR_scene_y;
			
			if(editor.selection.length > 0) {
				let p = editor.selection[0].toLocal(game.__mouse_EDITOR);
				txt += ' (x: ' + Math.round(p.x - editor.selection[0].pivot.x) + '; y: ' + Math.round(p.y - editor.selection[0].pivot.y) + ')';
			}
			
			let resetZoomBtn;
			if(game.stage) {
				if(game.stage.scale.x !== 1) {
					txt += ' zoom: ' + game.stage.scale.x;
				}
				if(game.stage.scale.x !== 1 || game.stage.x !== 0 || game.stage.y !== 0) {
					resetZoomBtn = R.btn('x', editor.ui.viewport.resetZoom, 'Reset zoom and viewport position (Ctrl + double-click on viewport)', 'reset-zoom-btn');
				}
			}
			editor.overlay.refreshCameraFrame();
			return R.span(null, resetZoomBtn, txt);
		}
		return R.span();
	}
}