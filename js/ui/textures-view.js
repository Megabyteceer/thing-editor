import Lib from "thing-engine/js/lib.js";
import group from "./group.js";
import Window from "./window.js";
import SelectEditor from "./props-editor/select-editor.js";


/*loading bits
	1 - on demand
	2 - early precache
	4 - no unload
*/

let view;

const LOADING_TYPES = [
	{
		name:'Preload',
		value:undefined
	},
	{
		name:'On Demand',
		value: 1
	},
	{
		name:'Early Precache',
		value: 3
	},
	{
		name:'On Demand, No Unload',
		value: 5
	},
	{
		name:'Early Precache, No Unload',
		value: 7
	}
];

const FILTER_SELECT = LOADING_TYPES.slice();
FILTER_SELECT.unshift({
	name: 'All',
	value: false
});

let labelProps = {
	className: 'selectable-text',
	onMouseDown: window.copyTextByClick
};

export default class TexturesView extends React.Component {

	static refresh() {
		if(view) {
			view.forceUpdate();
		}
	}

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
		this.state = {filter: false};
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
			title: 'Texture preloading mode'
		},
		React.createElement(SelectEditor, {onChange:(ev) => {
			if(ev.target.value) {
				opt[name] = ev.target.value;
			} else {
				delete opt[name];
			}
			editor.saveProjectDesc();
			this.forceUpdate();
		}, value:opt[name], select: LOADING_TYPES}),
		);
		
		let size;
		if(Lib.hasTexture(name)) {
			let texture = Lib.getTexture(name);
			size = texture.width + 'x' + texture.height;
		} else {
			size = '(unloaded)';
		}
		let path = this.imagesRoot + name + '?noCache=' + Lib.__noCacheCounter;
		return R.div({key:name, className:isOnDemandLoading ? 'textures-viewer-item redframe' : 'textures-viewer-item'},
			R.img({src: path, className:'textures-viewer-image', onDoubleClick:() => {
				editor.fs.editFile(path.split('?')[0]);

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
			R.span(null,
				React.createElement(SelectEditor, {onChange:(ev) => {
					this.setState({filter: ev.target.value});
				}, value:this.state.filter, select: FILTER_SELECT})
			),
			R.div({className:'list-view'},
				group.groupArray(list)
			)
		);
	}
}