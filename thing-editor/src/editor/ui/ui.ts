import { Component, ComponentChild, h } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import ProjectsList from "thing-editor/src/editor/ui/choose-project";
import Modal from "thing-editor/src/editor/ui/modal";
import Viewport from "thing-editor/src/editor/ui/viewport";

interface UIProps {
	onUIMounted: (ui: UI) => void
}

export default class UI extends Component<UIProps> {

	modal!: Modal;
	viewport!: Viewport;

	constructor() {
		super();

		this.modalRef = this.modalRef.bind(this);
		this.viewportRef = this.viewportRef.bind(this);
	}

	componentDidMount(): void {
		this.props.onUIMounted(this);
	}

	protected viewportRef(viewport: Viewport | null) {
		this.viewport = viewport as Viewport;
	}

	protected modalRef(ref: Modal | null) {
		this.modal = ref as Modal;
	}

	onOpenProjectClick() {
		ProjectsList.chooseProject();
	}

	render(): ComponentChild {
		return R.div(null,
			h(Viewport, { ref: this.viewportRef }),
			h(Modal, { ref: this.modalRef })
		);
	}

}