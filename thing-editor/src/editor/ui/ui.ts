import { ComponentChild, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import Window from "thing-editor/src/editor/ui/editor-window";
import Modal from "thing-editor/src/editor/ui/modal";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import StatusBar from "thing-editor/src/editor/ui/status-bar";
import TreeView from "thing-editor/src/editor/ui/tree-view/tree-view";
import Viewport from "thing-editor/src/editor/ui/viewport";
import game from "thing-editor/src/engine/game";

interface UIProps {
	onUIMounted: (ui: UI) => void
}

export default class UI extends ComponentDebounced<UIProps> {

	modal!: Modal;
	viewport!: Viewport;
	sceneTree!: TreeView;
	propsEditor!: PropsEditor;

	constructor() {
		super();

		this.modalRef = this.modalRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
		this.propsEditorRef = this.propsEditorRef.bind(this);
	}

	componentDidMount(): void {
		this.props.onUIMounted(this);
	}

	protected viewportRef(viewport: Viewport | null) {
		this.viewport = viewport as Viewport;
	}

	protected sceneTreeRef(sceneTree: TreeView | null) {
		this.sceneTree = sceneTree as TreeView;
	}

	protected modalRef(ref: Modal | null) {
		this.modal = ref as Modal;
	}

	protected propsEditorRef(ref: PropsEditor | null) {
		this.propsEditor = ref as PropsEditor;
	}

	onOpenProjectClick() {
		ProjectsList.chooseProject();
	}

	render(): ComponentChild {
		return R.fragment(R.div({ "data-help": 'editor.MainMenu' },
			R.btn('Open project...', this.onOpenProjectClick, undefined, 'menu-btn'),
			//R.btn('Browse...', this.onOpenProjectFolderClick, "Reveal in File Explorer", 'menu-btn'),
			//TODO   main menu tree  R.btn('Build', this.onBuildClick, "Build release version of game.", 'menu-btn'),
			//R.btn('Build debug', this.onBuildDebugClick, "Build debug version of game.\nContains asserts.", 'menu-btn'),
			//h(LanguageView),
			//h(TexturesView),
			//h(OptimizationView),
			game.editor.history.buttonsRenderer(),
			//R.btn('Project settings', game.editor.openProjectDescToEdit, undefined, 'menu-btn'),
			//editor.__preBuildAutoTest && R.btn('Test', editor.testProject, "Launch auto-tests", 'menu-btn'),
			//React.createElement(Help),
			/*	editor.fs.filesExt && editor.fs.filesExt.scripts.map((s) => {
					return R.span({ key: s.name }, R.btn(s.name.replace('scripts/', '').replace(/\.js$/, ''), () => {
						editor.fs.exec(s.name);
					}, undefined, 'menu-btn'));
				})*/
		),

			R.div(null,
				renderWindow('viewport', 'Viewport', R.span(null, 'Viewport: ', game.editor.projectDesc ? R.b(null, game.editor.currentSceneName) : undefined, h(StatusBar, null)),
					//TODO: StatusBar
					h(Viewport, { ref: this.viewportRef }),
					558, 0, 470, 600, 1362, 742, () => {
						if(game.projectDesc) {
							game._onContainerResize();
						}
					}),
				renderWindow('sceneTree', 'SceneTree', 'Scene tree',
					h(TreeView, { ref: this.sceneTreeRef }),
					0, 35, 250, 500, 250, 500),
				renderWindow('propsEditor', 'Properties', 'Properties',
					h(PropsEditor, {
						ref: this.propsEditorRef,
						onChange: game.editor.onSelectedPropsChange

					}),
					0, 35, 250, 500, 250, 500),



				h(Modal, { ref: this.modalRef })
			)
		);
	}

}

function renderWindow(id: string, helpId: string, title: ComponentChild, content: ComponentChild,
	x: number, y: number, minW: number, minH: number, w: number, _h: number, onResize?: () => void): ComponentChild {
	return h(Window, { id, helpId, title, content, x, y, minW, minH, w, h: _h, onResize });
}