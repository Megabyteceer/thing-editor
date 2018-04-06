import Window from '/js/editor/ui/window.js';
import Viewport from '/js/editor/ui/viewport.js';
import Button from '/js/editor/ui/button.js';

R.btn = function(label, onClick, className, toggledLabel){
	return React.createElement(Button, {label, onClick, className, toggledLabel});
}

function window(id, title, content, x, y, minW, minH, w, h) {
	return React.createElement(Window, {id, title, content, x, y, minW, minH, w, h});
}

class UI extends React.Component {
	
	componentDidMount() {
		this.props.onMounted(this);
	}

	
	render() {
		return R.div(null,
			window('sceneTree', 'Scene tree', 'Tree content', 0, 0, 250, 250, 250, 500),
			window('viewport', 'Viewport', React.createElement(Viewport), 1000, 0, 840, 480, 840, 480)
		
		
		);
	}
}
export default UI;