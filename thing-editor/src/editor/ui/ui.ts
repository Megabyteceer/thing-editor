import { Component, ComponentChild, h } from "preact";
import ClassesLoader from "thing-editor/src/editor/classes-loader";
import R from "thing-editor/src/editor/preact-fabrics";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import Window from "thing-editor/src/editor/ui/editor-window";
import Modal from "thing-editor/src/editor/ui/modal";
import TreeView from "thing-editor/src/editor/ui/tree-view/tree-view";
import Viewport from "thing-editor/src/editor/ui/viewport";
import game from "thing-editor/src/engine/game";

interface UIProps {
	onUIMounted: (ui: UI) => void
}

export default class UI extends Component<UIProps> {

	modal!: Modal;
	viewport!: Viewport;
	sceneTree!: TreeView;

	constructor() {
		super();

		this.modalRef = this.modalRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
		this.sceneTreeRef = this.sceneTreeRef.bind(this);
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

	onOpenProjectClick() {
		ProjectsList.chooseProject();
	}

	render(): ComponentChild {
		return R.div(null,
			renderWindow('viewport', 'Viewport', R.span(null, 'Viewport: ', game.editor.projectDesc ? R.b(null, game.editor.currentSceneName) : undefined),
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

			h(Modal, { ref: this.modalRef }),
			R.btn('reload classes', () => { ClassesLoader.reloadClasses(); })
		);
	}

}

function renderWindow(id: string, helpId: string, title: ComponentChild, content: ComponentChild,
	x: number, y: number, minW: number, minH: number, w: number, _h: number, onResize?: () => void): ComponentChild {
	return h(Window, { id, helpId, title, content, x, y, minW, minH, w, h: _h, onResize });
}