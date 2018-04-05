import Window from '/js/editor/ui/window.js';

function window(id, title, content, x, y, minW, minH, w, h) {
	return React.createElement(Window, {id, title, content, x, y, minW, minH, w, h});
}

class UI extends React.Component {
	
	componentWillMount() {
		EDITOR.ui = this;
	}
	render() {
		return R.div(null,
			window('sceneTree', 'Scene tree', 'Tree content', 0, 0, 250, 250, 250, 500),
			window('viewport', 'Viewport', 'Viewport content', 1000, 0, 840, 480, 840, 480)
		
		
		);
	}
}
export default UI;