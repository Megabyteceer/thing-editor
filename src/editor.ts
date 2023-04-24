import { Component } from "preact";
import R from "./preact-fabrics";

const thingEditorServer:ThingEditorServer = window.thingEditorServer;

const versionsInfo = Object.entries(thingEditorServer.versions).map(e => R.div(null, R.span({'className': 'version-header'}, e[0]), ': ', e[1]));

export default class Editor extends Component {
	componentDidMount() {
		this.setState({ message:'Thing-Editor 2.0 Hello!' });
	}
	render(props, state) {
		return R.span(null, state.message, versionsInfo);
	}
}

export {thingEditorServer};