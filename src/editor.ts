import { Component } from "preact";
import R from "./preact-fabrics";

const thingEditorServer:ThingEditorServer = window.thingEditorServer;

const versionsInfo = Object.entries(thingEditorServer.versions).map(e => R.div(null, R.span({'className': 'version-header'}, e[0]), ': ', e[1]));

interface EditorProps {
	recId: number;
}
interface EditorState {
	message: string;
}

export default class Editor extends Component<EditorProps, EditorState> {
	componentDidMount() {
		this.setState({ message:'Thing-Editor 2.0 Hello!' });
	}
	render(_props:EditorProps, state:EditorState) {
		return R.span(null, state.message, versionsInfo,
			R.button({
				className:'clickable',
				onClick:() => {
					alert(1);
				}},
			'ok')
		)
	}
}

export {thingEditorServer};