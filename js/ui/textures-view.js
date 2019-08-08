import Lib from "thing-engine/js/lib.js";
import group from "./group.js";
import Window from "./window.js";
import SelectEditor from "./props-editor/select-editor.js";
import game from "thing-engine/js/game.js";


/*loading bits
	1 - on demand
	2 - early precache
*/

let view;

const LOADING_TYPES = [
	{
		name:'default',
		value:undefined
	},
	{
		name:'On Demand',
		value: 1
	},
	{
		name:'Early Precache',
		value: 2
	}
];

const FILTER_SELECT = LOADING_TYPES.slice();
FILTER_SELECT.unshift({
	name: 'All',
	value: false
});

let labelProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy texture`s name',
	onMouseDown: window.copyTextByClick
};

const isParentFolderPropsDefined = (path) => {
	for(let f in editor.projectDesc.__loadOnDemandTexturesFolders) {
		if(path.startsWith(f + '/')) {
			return editor.projectDesc.__loadOnDemandTexturesFolders[f];
		}
	}
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

	static applyFoldersPropsToAllImages() {
		let opt = editor.projectDesc.loadOnDemandTextures;
		for(let i of Lib.__texturesList) {
			let name = i.value;
			let folderProps = isParentFolderPropsDefined(name);
			if(folderProps && (opt[name] != folderProps)) {
				opt[name] = folderProps;
				editor.saveProjectDesc();
			}
		}
	}

	render() {
		let btn = R.btn(this.state.toggled ? 'Close Textures Viewer (Ctrl+I)' : 'Open Textures Viewer (Ctrl+I)', this.onToggleClick, undefined, 'menu-btn', 1073);
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
		this.refreshView = this.refreshView.bind(this);
	}

	refreshView() {
		this.forceUpdate();
	}

	componentDidMount() {
		view = this;
		Window.bringWindowForward('#window-texturesviewer');
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

		let onDemandSwitcher;
		
		let folderProps = isParentFolderPropsDefined(name);
		if(!folderProps) {
			onDemandSwitcher = R.span({
				className: 'texture-preload-checkbox',
				title: 'Texture preloading mode'
			},
			React.createElement(SelectEditor, {onChange:(ev) => {
				if(opt[name] !== ev.target.value) {
					if(ev.target.value) {
						opt[name] = ev.target.value;
						game.__loadDynamicTextures();
					} else {
						game.__loadImageIfUnloaded(name);
						delete opt[name];
					}
					editor.saveProjectDesc();
					this.forceUpdate();
				}
			}, value:opt[name], select: LOADING_TYPES}),
			);
		} else {
			if(opt[name] != folderProps) {
				opt[name] = folderProps;
				editor.saveProjectDesc();
				window.debouncedCall(this.refreshView);
				window.debouncedCall(game.__loadDynamicTextures);
			}
		}

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
		let folders = {};
		for(let i of list) {
			let folderName = i.key.substring(0, i.key.lastIndexOf('/'));
			if(folderName) {
				folders[folderName] = true;
			}
		}
		for(let folderName in folders) {
			if(!isParentFolderPropsDefined(folderName)) {
				list.unshift(R.div({className:'folder-loading-settings', title:"Folder preloading mode", key: folderName +'/ folder-props ::'},
					React.createElement(SelectEditor, {onChange:(ev) => {
						let opt = editor.projectDesc.__loadOnDemandTexturesFolders;
						if(opt[folderName] !== ev.target.value) {
							if(ev.target.value) {
								let a = Object.keys(opt);
								for(let f of a) {
									if(f.startsWith(folderName + '/')) {
										delete opt[f];
									}
								}
								opt[folderName] = ev.target.value;
							} else {
								delete opt[folderName];
								let optImg = editor.projectDesc.loadOnDemandTextures;
								let a = Object.keys(optImg);
								for(let f of a) {
									if(f.startsWith(folderName + '/')) {
										game.__loadImageIfUnloaded(f);
										delete optImg[f];
									}
								}
							}
							editor.saveProjectDesc();
							this.forceUpdate();
						}
					}, value:editor.projectDesc.__loadOnDemandTexturesFolders[folderName], select: LOADING_TYPES}),
					
				));
			}
		}

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