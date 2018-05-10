import NumberEditor from "../number-editor.js";
import MovieClip from "/engine/js/components/movie-clip/movie-clip.js";

export default class Timeline extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}
	
	render() {
		return R.div(null,
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			editor.selection.map(renderObjectsTimeline)
		)
	}
}

const renderObjectsTimeline = (node) => {
	var key = __getNodeExtendData(node).id;
	if(node instanceof MovieClip) {
		return React.createElement(ObjectsTimeline, {node, key});
	} else {
		return R.div({key});
	}
}

class ObjectsTimeline extends React.Component {
	render() {
		var tl = this.props.node.timeline;
		return R.div(null,
			R.input({onChange:this.onPowChanged}),
			tl.f.map((field) => {
				return React.createElement(FieldsTimeline, {field, key:field.n});
			})
		)
	}
}

class FieldsTimeline extends React.Component {
	render() {
		var field = this.props.field;
		return R.div(null,
			field.n,
			field.t.map((keyFrame) => {
				return R.span({key:keyFrame.t}, keyFrame.t);
			}
		));
	}
}


