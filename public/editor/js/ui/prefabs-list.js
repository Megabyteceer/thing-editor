import Group from "./group.js";

var classViewProps = {
	className: 'vertical-layout', onBlur: () => {
		EDITOR.overlay.hidePreview();
	}
};
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
	}
	
	onAddClick() {
		if (this.state.selectedItem) {
			debugger;
			EDITOR.addToScene(Lib.__getNameByPrefab(this.state.selectedItem));
		}
	}
	
	onAddChildClick() {
		if (this.state.selectedItem) {
			debugger;
			EDITOR.addToSelected(Lib.__getNameByPrefab(this.state.selectedItem));
		}
	}
	
	onSaveSelectedAsClick() {
		
		if (EDITOR.selection.length === 0) {
			EDITOR.ui.modal.showModal('Nothing is selected in scene.');
		} else if (EDITOR.selection.length > 1) {
			EDITOR.ui.modal.showModal('More that one object selected.');
		} else if (EDITOR.ClassesLoader.getClassType(EDITOR.selection[0].constructor) === Scene) {
			EDITOR.ui.modal.showModal('You cant save Scene as prefab. Please select some object from scene first.');
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
			
			EDITOR.ui.modal.showPrompt('Enter name for new prefab:',
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
					Lib.__savePrefab(EDITOR.selection[0], enteredName);
					this.forceUpdate();
				}
			});
		}
	}
	
	onSelect(item) {
		var preview = Lib.loadPrefab(Lib.__getNameByPrefab(item));
		EDITOR.overlay.showPreview(preview);
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
		
		return R.div(classViewProps,
			R.span({className: panelClassname},
				R.btn('Add', this.onAddClick, 'Add prefab to scene'),
				R.btn('Child', this.onAddChildClick, 'Add prefab as children')
			),
			R.btn('Save...', this.onSaveSelectedAsClick, 'Save current selected object from scene as new prefab.'),
			R.div(bodyProps, prefabs)
		)
	}
	
	static readAllPrefabsList() {
		var prefabs = {};
		return Promise.all(
			EDITOR.fs.files.filter(fn => fn.match(prefabFileFiler))
			.map((fn) => {
				return EDITOR.fs.openFile(fn)
				.then((data) => {
					prefabs[fileNameToPrefabName(fn)] = data;
				});
			})
		).then(() => {
			Lib._setPrefabs(prefabs)
		});
	}
}