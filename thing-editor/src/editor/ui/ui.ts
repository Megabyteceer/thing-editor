import { ComponentChild, h, render } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import AssetsView from "thing-editor/src/editor/ui/assets-view/assets-view";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import Window from "thing-editor/src/editor/ui/editor-window";
import Modal from "thing-editor/src/editor/ui/modal";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import Status from "thing-editor/src/editor/ui/status";
import StatusBar from "thing-editor/src/editor/ui/status-bar";
import { TREE_NODE_CONTEXT_ARRANGE_MENU, TREE_NODE_CONTEXT_MENU } from "thing-editor/src/editor/ui/tree-view/tree-node-context-menu";
import TreeView from "thing-editor/src/editor/ui/tree-view/tree-view";
import Viewport from "thing-editor/src/editor/ui/viewport";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
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
			R.btn('Save', () => {
				if(PrefabEditor.currentPrefabName) {
					PrefabEditor.acceptPrefabEdition();
				} else {
					game.editor.saveCurrentScene();
				}
			}, 'Save current Scene', undefined, { key: 's', ctrlKey: true }),
			//R.btn('Browse...', this.onOpenProjectFolderClick, "Reveal in File Explorer", 'menu-btn'),
			//TODO   main menu tree  R.btn('Build', this.onBuildClick, "Build release version of game.", 'menu-btn'),
			//R.btn('Build debug', this.onBuildDebugClick, "Build debug version of game.\nContains asserts.", 'menu-btn'),
			//h(LanguageView),
			//h(TexturesView),
			//h(OptimizationView),
			game.editor.history.buttonsRenderer(),
			//R.btn('Project settings', game.editor.openProjectDescToEdit, undefined, 'menu-btn'),
			//editor.__preBuildAutoTest && R.btn('Test', editor.testProject, "Launch auto-tests", 'menu-btn'),
			//h(Help),
			/*	editor.fs.filesExt && editor.fs.filesExt.scripts.map((s) => {
					return R.span({ key: s.name }, R.btn(s.name.replace('scripts/', '').replace(/\.js$/, ''), () => {
						editor.fs.exec(s.name);
					}, undefined, 'menu-btn'));
				})*/
		),

			R.div(workingAreaProps,
				h(Window, {
					id: 'sceneTree',
					helpId: 'SceneTree',
					title: 'Scene tree',
					content: h(TreeView, { ref: this.sceneTreeRef }),
					x: 0, y: 0, w: 17, h: 70, minW: 150, minH: 150,
					hotkeysHandlers: [TREE_NODE_CONTEXT_MENU, TREE_NODE_CONTEXT_ARRANGE_MENU]
				}),

				h(Window, {
					id: 'propsEditor',
					helpId: 'Properties',
					title: 'Properties',
					content: h(PropsEditor, {
						ref: this.propsEditorRef,
						onChange: game.editor.onSelectedPropsChange
					}),
					x: 17,
					y: 0,
					w: 34,
					h: 70,
					minW: 250,
					minH: 150
				}),

				h(Window, {
					id: 'viewport',
					helpId: 'Viewport',
					title: R.span(null, 'Viewport: ', game.editor.projectDesc ? R.b(null, PrefabEditor.currentPrefabName || game.editor.currentSceneName) : undefined, h(StatusBar, null)),
					content: h(Viewport, { ref: this.viewportRef }),
					x: 34,
					y: 0,
					w: 100,
					h: 70,
					minW: 64,
					minH: 400,
					onResize: () => {
						if(game.projectDesc) {
							game._onContainerResize();
						}
					}
				}),

				AssetsView.renderAssetsViews(),

				h(Status, { ref: this.statusRef }),
				h(Modal, { ref: this.modalRef })
			)
		);
	}

}

const additionalWindowsContainers: Map<string, HTMLDivElement> = new Map();


function showAdditionalWindow(id: string, helpId: string, title: ComponentChild, content: ComponentChild,
	x: number, y: number, w: number, _h: number, minW: number, minH: number, onResize?: () => void) {
	if(!additionalWindowsContainers.has(id)) {
		let c = window.document.createElement('div');
		c.classList.add('additional-window-layer');
		window.document.querySelector('#working-area')?.appendChild(c);
		additionalWindowsContainers.set(id, c);
	}

	render(h(Window, { id, helpId, title, content, x, y, w, h: _h, minW, minH, onResize }), additionalWindowsContainers.get(id) as HTMLDivElement);
}

function hideAdditionalWindow(id: string) {
	if(additionalWindowsContainers.has(id)) {
		render(R.fragment(), additionalWindowsContainers.get(id) as HTMLDivElement);
	}
}

export { showAdditionalWindow, hideAdditionalWindow };

