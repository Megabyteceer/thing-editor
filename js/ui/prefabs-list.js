import Group from "./group.js";
import Scene from "thing-engine/js/components/scene.js";
import Lib from "thing-engine/js/lib.js";
import game from "thing-engine/js/game.js";
import PrefabReference from "thing-engine/js/components/prefab-reference.js";
import Container from "thing-engine/js/components/container.js";
import ClassesView from "./classes-view.js";
import OrientationTrigger from "thing-engine/js/components/orientation-trigger.js";

let bodyProps = {className: 'list-view'};

const prefabFileFiler = /^prefabs\/.*\.prefab.json$/gm;
const prefabExtRemover = /.prefab.json$/gm;
const fileNameToPrefabName = (fn) => {
	return fn.replace('prefabs/', '').replace(prefabExtRemover, '');
};

const prefabNameFilter = /[^a-z\-\/0-9_]/g;

let prefabNameProps = {
	className: "selectable-text", title: 'Ctrl+click to copy prefabs`s name', onMouseDown:window.copyTextByClick
};

let instance;

export default class PrefabsList extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
		this.onSaveSelectedAsClick = this.onSaveSelectedAsClick.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddChildClick = this.onAddChildClick.bind(this);
		this.reselectAllowed = true;
		this.searchInputProps = {
			className: 'prefabs-search-input',
			onChange: this.onSearchChange.bind(this),
			placeholder: 'Search',
			defaultValue: ''
		};
		instance = this;
	}

	onSearchChange(ev) {
		this.setState({filter: ev.target.value.toLowerCase()});
	}
	
	onAddClick(ev) {
		PrefabsList.exitPrefabEdit();
		if (this.state.selectedItem) {
			editor.addToScene(this._loadPrefab(this.state.selectedItem, ev.altKey));
		}
	}

	_loadPrefab(item, asReference) {
		let prefabName = Lib.__getNameByPrefab(item);
		if(!asReference) {
			return Lib.loadPrefab(prefabName);
		} else {
			let ret = ClassesView.loadSafeInstanceByClassName('PrefabReference');
			ret.prefabName = prefabName;
			return ret;
		}
	}
	
	onAddChildClick(ev) {
		PrefabsList.exitPrefabEdit();
		if (this.state.selectedItem) {
			this._addPrefabToChild(this.state.selectedItem, ev.altKey);
		}
	}

	_addPrefabToChild(item, asReference) {
		if(previewShown === Lib.__getNameByPrefab(item)) {
			PrefabsList.exitPrefabEdit(); // exit to level up
		}
		editor.attachToSelected(this._loadPrefab(item, asReference));
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

					const fin = (isConvertedToRef) => {
						if(editor.overlay.isPreviewShowed && !isConvertedToRef) {
							PrefabsList.editPrfefab(enteredName);
						}
						this.forceUpdate();
					};

					let s = editor.selection[0];
					Lib.__savePrefab(s, enteredName);
					if(s !== game.currentContainer) {
						editor.ui.modal.showEditorQuestion('Reference?', 'Turn selected in to prefab reference?', () => {
							
							let data = Lib.__serializeObject(s);
							data = {c :"PrefabReference", p: data.p};
							let ref = Lib._deserializeObject(data);
							
							ref.x = s.x; // for cases when save orientation trigger. its clear's x/y before serialization
							ref.y = s.y;
							ref.alpha = s.alpha;
							ref.rotation = s.rotation;
							ref.scale.x = s.scale.x;
							ref.scale.y = s.scale.y;
							
							ref.prefabName = enteredName;
							ref.inheritProps = !(s instanceof OrientationTrigger);

							s.parent.addChildAt(ref, s.parent.getChildIndex(s));
							s.remove();
							
							Lib.__invalidateSerializationCache(ref.parent);

							editor.ui.sceneTree.selectInTree(ref);

							editor.refreshTreeViewAndPropertyEditor();
							editor.sceneModified(true);
							fin(true);
						}, 'Convert to PrefabReference', fin, 'Keep as copy', true);
					} else {
						fin();
					}
					
				}
			});
		}
	}

	static editPrfefab(name) {
		if (game.__EDITOR_mode) {
			if(!Lib.hasPrefab(name)) {
				editor.ui.modal.showError("No prefab with name " + name + " exists.");
				return;
			}
			PrefabsList.acceptPrefabEdition();
			let preview = Lib.loadPrefab(name);
			__getNodeExtendData(preview).isPreviewObject = true;
			editor.overlay.showPreview(preview);
			editor.ui.sceneTree.selectInTree(preview);
			editor.ui.viewport.setPrefabMode(name);
			editor.history.clearHistory();
			previewShown = name;
			instance.setState({selectedItem: (Lib._getAllPrefabs())[name]});
		}
	}
	
	onSelect(item, ev, currentItem) {
		if(ev.altKey) {
			while(editor.selection[0] instanceof PrefabReference) {
				let p = editor.selection[0].parent;
				if(p === editor.game.stage) {
					break;
				}
				editor.selection.clearSelection();
				editor.selection.add(p);
			}
			this._addPrefabToChild(item, true);
			return currentItem;
		} else {
			PrefabsList.editPrfefab( Lib.__getNameByPrefab(item));
		}
	}
	
	onPrefabDeleteClick(prefabName) {
		editor.ui.modal.showEditorQuestion('Are you sure?', R.span({className:'danger'},
			'Are you sure you want to delete prefab: ', R.b(null, prefabName), ' ?',
			R.br(),
			'You cannot undo this action.'
		),() => {
			Lib.__deletePrefab(prefabName);
			if(previewShown === prefabName) {
				PrefabsList.exitPrefabEdit();
			}
			this.forceUpdate();
		}, 'Delete');

	}

	renderItem(prefabName, item) {
		let cls;
		if(Lib.__hasClass(item.c)) {
			cls = Lib.getClass(item.c);
		} else {
			cls = Container;
			editor.ui.status.warn('Prefab "' + prefabName + '" has unknown type: ' + item.c, 30028, () => {
				PrefabsList.editPrfefab(prefabName);
			});
		}
		return R.div({onDoubleClick:() => {
			editor.editClassSource(cls);
		}, key: prefabName, className:'prefab-list-item'},
		R.listItem(R.span(null, R.classIcon(cls), R.b(prefabNameProps, prefabName), ' (' + cls.name + ')'
			,
			R.btn('×', () => {
				this.onPrefabDeleteClick(prefabName);
			}, 'Delete prefab...', 'danger-btn delete-scene-btn')
		
		), item, prefabName, this)
		);
	}
	
	render() {
		let scenePrefabs = Lib._getAllPrefabs();
		
		let panelClassname = this.state.selectedItem ? '' : 'unclickable';
		
		let prefabs = [];
		let prefabsNames = Object.keys(scenePrefabs);
		prefabsNames.sort();

		for (let prefabName of prefabsNames) {
			if(!this.state.filter || prefabName.indexOf(this.state.filter) >= 0) {
				prefabs.push(this.renderItem(prefabName, scenePrefabs[prefabName]));
			}
		}
		if(!this.state.filter) {
			prefabs = Group.groupArray(prefabs);
		}
		return R.fragment(
			R.span({className: panelClassname},
				R.btn('Add', this.onAddClick, 'Add prefab to scene. (Hold Alt key to add prefab as Reference)'),
				R.btn('Child', this.onAddChildClick, 'Add prefab as children. (Hold Alt key to add prefab as Reference)')
			),
			R.btn('Save...', this.onSaveSelectedAsClick, 'Save currently selected on scene object as new prefab.'),
			R.input(this.searchInputProps),
			R.div(bodyProps, prefabs)
		);
	}
	
	static acceptPrefabEdition() {
		let name = previewShown;
		let isChanged = previewShown && editor.isCurrentContainerModified;
		if(isChanged) {
			editor.history.setCurrentStateUnmodified();
			editor._callInPortraitMode(() => {
				Lib.__savePrefab(game.currentContainer, previewShown);
			});
			editor.ui.prefabsList.forceUpdate();
		}
		PrefabsList.exitPrefabEdit();
		if(isChanged) {
			PrefabReference.__refreshPrefabRefs(name);
		}
	}
	
	static exitPrefabEdit() {
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
			editor.fs.files.prefabs.filter(fn => fn.match(prefabFileFiler))
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