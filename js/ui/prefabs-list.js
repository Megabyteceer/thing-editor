import Group from "./group.js";
import Scene from "/thing-engine/js/components/scene.js";
import Lib from "/thing-engine/js/lib.js";
import game from "/thing-engine/js/game.js";

let bodyProps = {className: 'list-view'};

const prefabFileFiler = /^prefabs\/.*\.prefab.json$/gm;
const prefabExtRemover = /.prefab.json$/gm;
const fileNameToPrefabName = (fn) => {
	return fn.replace('prefabs/', '').replace(prefabExtRemover, '');
};

const prefabNameFilter = /[^a-z\-\/0-9]/g;

let prefabNameProps = {
	className: "selectable-text", title: 'click to select prefabs`s name', onMouseDown:window.copyTextByClick
};

export default class PrefabsList extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
		this.onSaveSelectedAsClick = this.onSaveSelectedAsClick.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddChildClick = this.onAddChildClick.bind(this);
		this.reselectAllowed = true;
	}
	
	onAddClick() {
		PrefabsList.hidePrefabPreview();
		if (this.state.selectedItem) {
			editor.addToScene(Lib.loadPrefab(Lib.__getNameByPrefab(this.state.selectedItem)));
		}
	}
	
	onAddChildClick() {
		PrefabsList.hidePrefabPreview();
		if (this.state.selectedItem) {
			editor.attachToSelected(Lib.loadPrefab(Lib.__getNameByPrefab(this.state.selectedItem)));
		}
	}
	
	onSaveSelectedAsClick() {
		if (editor.selection.length === 0) {
			editor.ui.modal.showModal('Nothing is selected in scene.');
		} else if (editor.selection.length > 1) {
			editor.ui.modal.showModal('More that one object selected.');
		} else if (editor.ClassesLoader.getClassType(editor.selection[0].constructor) === Scene) {
			editor.ui.modal.showModal('You cant save Scene as prefab. Please select some object from scene first.');
		} else {
			
			let defaultPrefabName = '';
			if (this.state.selectedItem && this.state.selectedItem.p.name) {
				defaultPrefabName = this.state.selectedItem.p.name.split('/');
				defaultPrefabName.pop();
				defaultPrefabName = defaultPrefabName.join('/');
				if (defaultPrefabName) {
					defaultPrefabName += '/';
				}
			}
			
			editor.ui.modal.showPrompt(R.span(null, 'Enter name for new prefab: ', R.sceneNode(editor.selection[0])),
				defaultPrefabName,
				(val) => { // filter
					return val.toLowerCase().replace(prefabNameFilter, '-');
				},
				(val) => { //accept
					if (Lib.scenes.hasOwnProperty(val)) {
						return "Name already exists";
					}
					if (val.endsWith('/') || val.startsWith('/')) {
						return 'name can not begin or end with "/"';
					}
				}
			).then((enteredName) => {
				if (enteredName) {
					let s = editor.selection[0];
					let tx = s.x;
					let ty = s.y;
					s.x = game.W / 2;
					s.y = game.H / 2;
					Lib.__savePrefab(s, enteredName);
					s.x = tx;
					s.y = ty;
					this.forceUpdate();
				}
			});
		}
	}
	
	onSelect(item) {
		if (game.__EDITORmode) {
			let name = Lib.__getNameByPrefab(item);
			PrefabsList.acceptPrefabEdition();
			let preview = Lib.loadPrefab(name);
			__getNodeExtendData(preview).__EDITOR_isPreviewObject = true;
			editor.overlay.showPreview(preview);
			editor.ui.sceneTree.selectInTree(preview);
			editor.ui.viewport.setPrefabMode(name);
			editor.history.clearHistory();
			previewShown = name;
		}
	}
		
	renderItem(prefabName, item) {
		let cls = Lib.getClass(item.c);
		return R.div({onDoubleClick:() => {
			editor.editClassSource(cls);
		}, key: prefabName},
		R.listItem(R.span(null, R.classIcon(cls), R.b(prefabNameProps, prefabName), ' (' + cls.name + ')'), item, prefabName, this)
		);
	}
	
	render() {
		let scenePrefabs = Lib._getAllPrefabs();
		
		let panelClassname = this.state.selectedItem ? '' : 'unclickable';
		
		let prefabs = [];
		let prefabsNames = Object.keys(scenePrefabs);
		prefabsNames.sort();

		for (let prefabName of prefabsNames) {
			prefabs.push(this.renderItem(prefabName, scenePrefabs[prefabName]));
		}
		
		prefabs = Group.groupArray(prefabs);
		
		return R.fragment(
			R.span({className: panelClassname},
				R.btn('Add', this.onAddClick, 'Add prefab to scene'),
				R.btn('Child', this.onAddChildClick, 'Add prefab as children')
			),
			R.btn('Save...', this.onSaveSelectedAsClick, 'Save currently selected on scene object as new prefab.'),
			R.div(bodyProps, prefabs)
		);
	}
	
	static acceptPrefabEdition() {
		if(previewShown && editor.isCurrentSceneModified) {
			Lib.__savePrefab(game.currentContainer, previewShown);
			editor.ui.prefabsList.forceUpdate();
		}
		PrefabsList.hidePrefabPreview();
	}
	
	static hidePrefabPreview() {
		if(previewShown) {
			editor.ui.viewport.setPrefabMode(false);
			previewShown = false;
			editor.overlay.hidePreview();
		}
	}
	
	static choosePrefab(title, noEasyClose) {
		
		let libsPrefabs = Lib._getAllPrefabs();
		
		let prefabs = [];
		for (let name in libsPrefabs) {
			let sceneData = libsPrefabs[name];
			let c = Lib.getClass(sceneData.c);
			prefabs.push({name:name, __EDITOR_icon: c.__EDITOR_icon});
		}
		return editor.ui.modal.showListChoose(title || "Choose prefab", prefabs, noEasyClose).then((choosed) => {
			if(choosed) {
				return choosed.name;
			}
			return null;
		});
	}

	static readAllPrefabsList() {
		let prefabs = {};
		return Promise.all(
			editor.fs.files.filter(fn => fn.match(prefabFileFiler))
				.map((fn) => {
					return editor.fs.openFile(fn)
						.then((data) => {
							prefabs[fileNameToPrefabName(fn)] = data;
						});
				})
		).then(() => {
			Lib._setPrefabs(prefabs);
		});
	}
}

let previewShown = false;