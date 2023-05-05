import { ClassAttributes, Component, ComponentChild } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";

interface ViewportProps extends ClassAttributes<Viewport> {

}

export default class Viewport extends Component<ViewportProps> {

	stopExecution() {
		//TODO:
	}

	render(): ComponentChild {
		return R.div();
	}

}