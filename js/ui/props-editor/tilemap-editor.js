import Window from "../window.js";
import Tilemap from "thing-engine/js/components/tilemap.js";
import Lib from "thing-engine/js/lib.js";
import SelectEditor from "thing-editor/js/ui/props-editor/select-editor.js";
import NumberEditor from "thing-editor/js/ui/props-editor/number-editor.js";
import game from "thing-engine/js/game.js";

export default class tilemapEditorRenderer extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {toggled:true};
		this.onToggleClick = this.onToggleClick.bind(this);
	}
	
	onToggleClick() {
		let t = !this.state.toggled;
		this.setState({toggled: t});
	}
	
	render () {
		let btn = R.btn(this.state.toggled ? 'Close TileEditor (Ctrl+L)' : 'Open TileEditor (Ctrl+L)', this.onToggleClick, undefined, undefined, 1076);
		let tilemapEditor;
		if(this.state.toggled) {
			tilemapEditor = editor.ui.renderWindow('tilemap', 'Tilemap Editor', React.createElement(TilemapEditor, {onCloseClick:this.onToggleClick}), 586, 650, 400, 150, 737, 307);
			Window.bringWindowForward('#window-propsEditor');
			Window.bringWindowForward('#window-tilemap');
		}
		return R.fragment(btn, tilemapEditor);
	}
}

let viewport;
let isSetting;
let isErasing;
function getTilemap() {
	return editor.selection[0];
}

function refreshTilemap() {
	getTilemap().updateView();
}

class TilemapEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onTypeChange = this.onTypeChange.bind(this);
		this.onSizeChange = this.onSizeChange.bind(this);
		this.state= {
			type: editor.settings.getItem('tilemap-type', 0),
			size: editor.settings.getItem('tilemap-size', 1)
		};
	}


	componentDidMount() {
		viewport = document.querySelector('#viewport-root canvas');
		viewport.addEventListener('mousedown', this.onMouseDown);
		viewport.addEventListener('mousemove', this.onMouseMove);
		viewport.addEventListener('mouseup', this.onMouseUp);
		window.addEventListener('keydown', this.onKeyDown);
		editor.overlay.disableSelection(true);
		assert(getTilemap() instanceof Tilemap, "Tilemap expected");
		refreshTilemap();
	}
	
	componentWillUnmount() {
		editor.overlay.disableSelection(false);
		viewport.removeEventListener('mousedown', this.onMouseDown);
		viewport.removeEventListener('mousemove', this.onMouseMove);
		viewport.removeEventListener('mouseup', this.onMouseUp);
		window.removeEventListener('keydown', this.onKeyDown);
		isSetting = false;
	}

	onKeyDown(ev) {
		if (!window.isEventFocusOnInputElement(ev) && (ev.keyCode >= 48) && (ev.keyCode <= 57)) {
			this.setType(Math.min(ev.keyCode - 48, Tilemap.tileMapProcessor.types.length));
		}
	}

	onSizeChange(ev) {
		this.setSize(ev.target.value);
	}
		
	onTypeChange(ev) {
		this.setType(ev.target.value);
	}

	onMouseDown(ev) {

		if(editor.overlay.isDraggerOvered()) {
			return;
		}

		if(ev.buttons === 1) {
			isSetting = true;
		}
		if(ev.buttons === 2) {
			isErasing = true;
		}
		this.onMouseMove(ev);
	}

	onClearClick() {
		editor.ui.modal.showQuestion("Are you sure?", "Clear tilemap?", ()=>{
			getTilemap().clear();
			Lib.__invalidateSerialisationCache(getTilemap());
			editor.sceneModified();
		});
	}

	setTile(X, Y, type) {
			
		let size = this.state.size;
		
		X -= Math.floor(size / 2);
		Y -= Math.floor(size / 2);
		

		let sceneWasModified = false;
		
		for (let i = 0; i < size; i++) {
			
			for (let j = 0; j < size; j++) {
				
				if(this.setOneTile(X, Y, type)) {
					sceneWasModified = true;
				}
				
				X++;
			}
			X -= size;
			Y++;
		}

		if(sceneWasModified) {
			refreshTilemap();
			Lib.__invalidateSerialisationCache(getTilemap());
			editor.sceneModified();
		}
	}
	
	setOneTile(X, Y, type) {

		X = Math.floor(X);
		Y = Math.floor(Y);

		if(X < 0 || Y < 0 || X >= getTilemap().columns || Y >= getTilemap().rows) {
			return;
		}

		let pt = Tilemap.tileMapProcessor.imageToType(getTilemap().getTile(X, Y));
		if (pt !== type) {
			Tilemap.tileMapProcessor.onTileEditCallback(getTilemap(), X, Y, type);
			return true;
		}
	}

	onMouseMove(ev) {
		if(ev.buttons === 0) {
			isErasing = false;
			isSetting = false;
			return;
		}
		if(isErasing || isSetting) {
			let p = getTilemap().toLocal(game.__mouse_EDITOR);
			
			var X = p.x / getTilemap().tileW;
			var Y = p.y / getTilemap().tileH;
			this.setTile(X, Y, isErasing ? -1 : this.state.type);
		}
	}

	onMouseUp() {
		isErasing = false;
		isSetting = false;
	}

	setType(t) {
		this.setState({type:t});
		editor.settings.setItem('tilemap-type', t);
	}
	
	setSize(t) {
		this.setState({size:t});
		editor.settings.setItem('tilemap-size', t);
	}

	render() {
		if(editor.selection.length !== 1) {
			return R.div(null, "Please select only one tilemap component at once.");
		} else {
			return R.div(null,
				'Tile type:',
				R.b(null, 
					React.createElement(SelectEditor, {onChange:this.onTypeChange, value:this.state.type, select: Tilemap.tileMapProcessor.types.map((t) => {
						return {name:t.name + '(' + t.value + ')', value:t.value};
					})})
				),
				' Brush size: ',
				React.createElement(NumberEditor, {onChange:this.onSizeChange, field:{name:'brush-size', min:1, max:10}, value:this.state.size}),
				R.btn('Clear', this.onClearClick, "Clear whole tilemap.")
			);
		}
	}

}