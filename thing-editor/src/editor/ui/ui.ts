import { ComponentChild, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import Window from "thing-editor/src/editor/ui/editor-window";
import Modal from "thing-editor/src/editor/ui/modal";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import Status from "thing-editor/src/editor/ui/status";
import StatusBar from "thing-editor/src/editor/ui/status-bar";
import TreeView from "thing-editor/src/editor/ui/tree-view/tree-view";
import Viewport from "thing-editor/src/editor/ui/viewport";
import game from "thing-editor/src/engine/game";

interface UIProps {
	onUIMounted: (ui: UI) => void
}

const menyProps = {
	className: 'main-menu',
	"data-help": 'editor.MainMenu' //TODO chek help
}
const workingAreaProps = {
	id: 'working-area'
}

export default class UI extends ComponentDebounced<UIProps> {

	modal!: Modal;
	viewport!: Viewport;
	sceneTree!: TreeView;
	propsEditor!: PropsEditor;
	status!: Status;

	constructor() {
		super();

		this.modalRef = this.modalRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
		this.propsEditorRef = this.propsEditorRef.bind(this);
		this.statusRef = this.statusRef.bind(this);
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

	protected statusRef(ref: Status | null) {
		this.status = ref as Status;
	}

	onOpenProjectClick() {
		ProjectsList.chooseProject();
	}

	render(): ComponentChild {
		return R.fragment(R.div(menyProps,
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

			R.div(workingAreaProps,

				renderWindow('sceneTree', 'SceneTree', 'Scene tree',
					h(TreeView, { ref: this.sceneTreeRef }),
					0, 0, 17, 70, 150, 150),
				renderWindow('propsEditor', 'Properties', 'Properties',
					h(PropsEditor, {
						ref: this.propsEditorRef,
						onChange: game.editor.onSelectedPropsChange
					}),
					17, 0, 34, 70, 250, 150),
				renderWindow(
					'viewport',
					'Viewport',
					R.span(null, 'Viewport: ', game.editor.projectDesc ? R.b(null, game.editor.currentSceneName) : undefined, h(StatusBar, null)),
					//TODO: StatusBar
					h(Viewport, { ref: this.viewportRef }),
					34, 0, 100, 70, 64, 600, () => {
						if(game.projectDesc) {
							game._onContainerResize();
						}
					}),
				AssetsView.renderAssetsViews(),

				h(Status, { ref: this.statusRef }),
				h(Modal, { ref: this.modalRef })
			)
		);
	}

}

function renderWindow(id: string, helpId: string, title: ComponentChild, content: ComponentChild,
	x: number, y: number, w: number, _h: number, minW: number, minH: number, onResize?: () => void): ComponentChild {
	return h(Window, { id, helpId, title, content, x, y, minW, minH, w, h: _h, onResize });
}

export { renderWindow };
