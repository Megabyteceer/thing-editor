import Window from "../window.js";

export default function tilemapEditorRenderer(props) {
	
	setTimeout(() => {
		Window.bringWindowForward($('#window-propsEditor'));
		Window.bringWindowForward($('#window-tilemap'));
	}, 1);
	
	return editor.ui.renderWindow('tilemap', 'Tilemap Editor', React.createElement(TilemapEditor), 586, 650, 400, 150, 1137, 407);
}


class TilemapEditor extends React.Component {
	
	render() {
		if(editor.selection.length !== 1) {
			return R.div(null, "Please select only one tilemap component at once.");
		} else {
			return R.div(null,
				'Tilemap editor'
				
			)
		}
	}

}