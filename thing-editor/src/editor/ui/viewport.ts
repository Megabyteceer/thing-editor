import { ClassAttributes, Component, ComponentChild } from "preact";
import ClassesLoader from "thing-editor/src/editor/classes-loader";
import R from "thing-editor/src/editor/preact-fabrics";

interface ViewportProps extends ClassAttributes<Viewport> {

}

export default class Viewport extends Component<ViewportProps> {

	stopExecution() {
		//TODO:
	}

	onDoubleClick() {
		//TODO:
	}

	onDragOver() {
		//TODO:
	}

	onDrop() {
		//TODO:
	}

	render(): ComponentChild {
		return R.div(null,
			R.btn('reload classes', () => { ClassesLoader.reloadClasses(); }),
			R.div({
				id: 'viewport-root',
				className: 'editor-viewport',
				onDoubleClick: this.onDoubleClick,
				onDragOver: this.onDragOver,
				onDrop: this.onDrop,
			})
		)
	}

}