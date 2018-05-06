import Group from "./group.js";

var bodyProps = {className: 'list-view'};

const prefabFileFiler = /^prefabs\/.*\.prefab.json$/gm;
const prefabExtRemover = /.prefab.json$/gm;
const fileNameToPrefabName = (fn) => {
	return fn.replace('prefabs/', '').replace(prefabExtRemover, '');
}

const prefabNameFilter = /[^a-z\-\/0-9]/g;

var prefabNameProps = {
	className: "selectable-text", title: 'click to select prefabs`s name', onMouseDown: function (ev) {
		selectText(ev.target);
		sp(ev);
	}
};

const prefabNameToFileName = (name) => {
	return 'prefabs/' + name + '.prefab.json';
}

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
			
			var defaultPrefabName = '';
			if (this.state.selectedItem) {
				defaultPrefabName = this.state.selectedItem.split('/');
				defaultPrefabName.pop();
				defaultPrefabName = defaultPrefabName.join('/');
				if (defaultPrefabName) {
					defaultPrefabName += '/';
				}
			}
			
			editor.ui.modal.showPrompt('Enter name for new prefab:',
				defaultPrefabName,
				(val) => { // filter
					return val.toLowerCase().replace(prefabNameFilter, '');
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
					var s = editor.selection[0];
					var tx = s.x;
					var ty = s.y;
					s.x = W / 2;
					s.y = H / 2;
					Lib.__savePrefab(s, enteredName);
					s.x = tx;
					s.y = ty;
					this.forceUpdate();
				}
			});
		}
	}
	
	onSelect(item) {
		if(game.__EDITORmode) {
			var name = Lib.__getNameByPrefab(item);
			PrefabsList.acceptPrefabEdition();
			var preview = Lib.loadPrefab(name);
			editor.overlay.showPreview(preview);
			editor.ui.sceneTree.selectInTree(preview);
            editor.ui.viewport.setPrefabMode(name);
            editor.history.clearHistory(item);
			previewShown = name;
		}
	}
	
	renderItem(prefabName, item) {
		var cls = Lib.getClass(item.c);
		return R.div({key: prefabName},
			R.listItem(R.span(null, R.classIcon(cls), R.b(prefabNameProps, prefabName), ' (' + cls.name + ')'), item, prefabName, this)
		);
	}
	
	render() {
		var scenePrefabs = Lib._getAllPrefabs();
		
		var panelClassname = this.state.selectedItem ? '' : 'unclickable';
		
		var prefabs = [];
		for (var prefabName in scenePrefabs) {
			prefabs.push(this.renderItem(prefabName, scenePrefabs[prefabName]));
		}
		
		prefabs = Group.groupArray(prefabs);
		
		return R.fragment(
			R.span({className: panelClassname},
				R.btn('Add', this.onAddClick, 'Add prefab to scene'),
				R.btn('Child', this.onAddChildClick, 'Add prefab as children')
			),
			R.btn('New...', this.onSaveSelectedAsClick, 'Create new prefab from selected objecton scene.'),
			R.div(bodyProps, prefabs)
		)
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
	
	static readAllPrefabsList() {
		var prefabs = {};
		return Promise.all(
			editor.fs.files.filter(fn => fn.match(prefabFileFiler))
			.map((fn) => {
				return editor.fs.openFile(fn)
				.then((data) => {
					prefabs[fileNameToPrefabName(fn)] = data;
				});
			})
		).then(() => {
			Lib._setPrefabs(prefabs)
		});
	}
}

var previewShown = false;


$(document.body).on('click', (ev) =>{
	if(ev.target === document.body){
		PrefabsList.acceptPrefabEdition();
	}
});