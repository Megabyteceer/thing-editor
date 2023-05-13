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
		return R.div(null,
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
		);
	}

}

function renderWindow(id: string, helpId: string, title: ComponentChild, content: ComponentChild,
	x: number, y: number, minW: number, minH: number, w: number, _h: number, onResize?: () => void): ComponentChild {
	return h(Window, { id, helpId, title, content, x, y, minW, minH, w, h: _h, onResize });
}