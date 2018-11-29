import Lib from "thing-engine/js/lib.js";
import group from "./group.js";
import Window from "./window.js";

let view;

let labelProps = {
	className: 'selectable-text',
	onMouseDown: window.copyTextByClick
};

export default class TexturesView extends React.Component {

	constructor(props) {
		super(props);
		this.state = {};
		this.onToggleClick = this.onToggleClick.bind(this);
	}

	onToggleClick() {
		let t = !this.state.toggled;
		this.setState({
			toggled: t
		});
	}

	render() {
		let btn = R.btn(this.state.toggled ? 'Close Textures Viewer (Ctrl+I)' : 'Open Textures Viewer (Ctrl+I)', this.onToggleClick, undefined, undefined, 1073);
		let table;
		if (this.state.toggled) {
			table = editor.ui.renderWindow('texturesviewer', 'Textures Viewer', R.fragment(
				R.btn('×', this.onToggleClick, 'Hide Textures Viewer', 'close-window-btn'),
				React.createElement(TexturesViewerBody)), 200, 100, 620, 300, 900, 800);
		}
		return R.fragment(btn, table);
	}
}

class TexturesViewerBody extends React.Component {

	constructor(props) {
		super(props);
		this.renderItem = this.renderItem.bind(this);
		this.imagesRoot = '../../games/' + editor.currentProjectDir + 'img/';
	}

	componentDidMount() {
		view = this;
		setTimeout(() => {
			Window.bringWindowForward($('#window-texturesviewer'));
		}, 1);
	}

	componentWillUnmount() {
		view = null;
	}

	renderItem(item) {
		let name = item.value;
		if (name === 'WHITE' || name === 'EMPTY') {
			return R.div({key:name});
		}
		var opt = editor.projectDesc.loadOnDemandTextures;
		let isOnDemandLoading = opt.hasOwnProperty(name);

		let onDemandSwitcher = R.span({
			className: 'texture-preload-checkbox',
			title: 'Preload texture.',
			onClick: (ev) => {
				ev.stopPropagation();
				if (isOnDemandLoading) {
					delete opt[name];
				} else {
					opt[name] = 1;
				}
				editor.saveProjectDesc();
				this.forceUpdate();
			}
		},
		editor.projectDesc.loadOnDemandTextures.hasOwnProperty(name) ? '☐' : '☑'
		);
		
		let texture = Lib.getTexture(name);
		let size = texture.width + 'x' + texture.height;
		let path = this.imagesRoot + name;
		return R.div({key:name, className:isOnDemandLoading ? 'textures-viewer-item redframe' : 'textures-viewer-item'},
			R.img({src: path, className:'textures-viewer-image', onDoubleClick:() => {
				editor.fs.editFile(path);

			},
			onDragStart(ev) {
				ev.dataTransfer.setData("text/thing-editor-image-id", name);
			}
			}),
			R.b(labelProps, name),
			R.br(),	
			size,
			onDemandSwitcher
		);
	}

	render() {
		let list = Lib.__texturesList.map(this.renderItem);
		return R.div(null,
			R.btn(R.icon('reload-assets'), editor.ui.viewport.onReloadAssetsClick, 'Reload game assets', 'big-btn'),
			R.div({className:'list-view'},
				group.groupArray(list)
			)
		);
	}
}