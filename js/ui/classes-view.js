import Group from "./group.js";
import Lib from "thing-engine/js/lib.js";
import game from "thing-engine/js/game.js";
import Container from "thing-engine/js/components/container.js";
import Tilemap from "thing-engine/js/components/tilemap.js";
import fs from "../utils/fs.js";
import PropsEditor from "./props-editor/props-editor.js";


const bodyProps = {className: 'list-view'};
const classItemSubProps = {className: 'class-list-item-sub'};

class ClassesView extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.renderItem = this.renderItem.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddAsChildClick = this.onAddAsChildClick.bind(this);
		this.onWrapSelectedClick = this.onWrapSelectedClick.bind(this);
	}
	
	onAddClick() {
		editor.addToScene(ClassesView.loadSafeInstanceByClassName(this.state.selectedItem.c.name));
	}
	
	onAddAsChildClick() {
		if(isCanBeAddedAsChild()) {
			editor.attachToSelected(ClassesView.loadSafeInstanceByClassName(this.state.selectedItem.c.name));
		}
	}
	
	static loadSafeInstanceByClassName(className) {
		// editor.saveBackup();
		let ret = Lib._loadClassInstanceById(className);
		if(ret.__EDITOR_onCreate) {
			ret.__EDITOR_onCreate();
		}
		// editor.cleanupBackup();
		return ret;
	}
	
	onWrapSelectedClick() {
		editor.wrapSelected(this.state.selectedItem.c.name);
	}

	onNewComponentClick() {
		editor.ui.modal.showListChoose("Choose template for new Custom Component", [
			{
				title: "Basic Game Object",
				desc: "Cretes simple game object. Then you can programm this object's logic with javascript. This type of object will contain only basic methods of game object 'init', 'update', 'onRemove', but you can add any method you want manually.",
				path: 'basic-game-object.js',
				isScene: false
			},
			{
				title: "Basic Scene",
				desc: "Creates new type of scenes. Then you can create new scenes with this type.",
				path: 'basic-scene.js',
				isScene: true
			},
			{
				title: "Full Game Object",
				desc: "Contains all the mothods of game object. Include 'game mothods', and 'editor mode methods'.",
				path: 'full-game-object.js',
				isScene: false
			},
			{
				title: "Full Scene",
				desc: "Creates new type of scenes. Then you can create new scenes with this type.",
				path: 'full-scene.js',
				isScene: true
			}
		].map((tmp) => {
			tmp.pureName = tmp.title;
			tmp.name = R.div({className: 'project-item-select'},
				R.div(null, tmp.title),
				R.div({className: 'template-desc'}, tmp.desc)
			);
			return tmp;
		})).then((selectedTemplate) => {
			if(selectedTemplate) {
				PropsEditor.showSelectClass(selectedTemplate.isScene, 'Choose base Component').then((selectedBaseClass) => {
					if(selectedBaseClass) {
						editor.ui.modal.showPrompt('Enter Component Name',
							selectedTemplate.isScene ? 'MyNewScene' : 'MyNewComponent',
							(val) => { //filter
								return  val.replace(/[^a-zA-Z0-9\/]/gm, '_');
							},
							(val) => { //accept
								if (Lib.__hasClass(val)) {
									return "Component with name '" + val + "' already exists";
								}
							}
						).then((enteredClassName) => {
							if(enteredClassName) {
								let a = enteredClassName.split('/').filter(i => i);
								enteredClassName = a.pop();
								if(!enteredClassName) {
									editor.ui.modal.showError('Wrong name.');
									return;
								} 
								if(enteredClassName.match('/^\d/m')) {
									editor.ui.modal.showError('Class name can not start with digit.');
									return;
								}
								enteredClassName = enteredClassName.substr(0, 1).toUpperCase() + enteredClassName.substr(1);
								if (Lib.__hasClass(enteredClassName)) {
									editor.ui.modal.showError("Component with name '" + enteredClassName + "' already exists");
									return;
								}
								let classFoldername = a.join('/');
								fs.getJSON('/thing-editor/js/templates/' + selectedTemplate.path).then((templateSrc) => {
									
									//add or remove super mothod call if its exists
									let baseClassInsance = new selectedBaseClass();
									const regex = /(\/\/)(super\.)([a-zA-Z_]+)(\(\);)/gm;
									templateSrc = templateSrc.replace(regex, (substr, m1, m2, m3, m4) => {
										let isSuperClassHasThgisMethod = baseClassInsance[m3];
										if(isSuperClassHasThgisMethod) {
											return m2 + m3 + m4;
										} else {
											return '';
										}
									});

									const baseClassPath = editor.ClassesLoader.getClassPath(selectedBaseClass.name);

									templateSrc = templateSrc.replace(/NEW_CLASS_NAME/gm, enteredClassName);
									templateSrc = templateSrc.replace(/BASE_CLASS_NAME/gm, selectedBaseClass.name);
									templateSrc = templateSrc.replace(/\/BASE_CLASS_PATH/gm, baseClassPath);
									templateSrc = templateSrc.replace(/BASE_CLASS_PATH/gm, baseClassPath);

									let fileName = enteredClassName.replace(/[A-Z]/gm, (substr, offset) => {
										return ((offset === 0) ? '' : '-') + substr.toLowerCase();
									});
									fileName = (selectedTemplate.isScene ?'src/scenes/' : 'src/game-objects/') + classFoldername + '/' + fileName + '.js';
									fs.saveFile(fileName, templateSrc).then(() => {
										editor.fs.editFile(fileName);
										editor.reloadClasses();
									});

								});
								
							}
						});
					}
				});
			}
		});
	}

	onSelect() {
	
	}
	
	renderItem(item) {
		let tip;
		if(item.c.__EDITOR_tip) {
			tip = R.tip('class-' + item.c.name,
				'Component "' + item.c.name + '" description:',
				item.c.__EDITOR_tip
			);
		}
		let key;
		if(item.c.hasOwnProperty('__EDITOR_group')) {
			key = item.c.__EDITOR_group + '/' + item.c.name;
		} else {
			key = 'Custom/' + item.c.name;
		}
		
		return R.listItem(
			R.div({
				onDoubleClick:(ev) => {
					if(ev.target.tagName !== 'BUTTON') {
						editor.editClassSource(item.c);
					}
				},
				className: 'class-list-item'
			},
			R.div(classItemSubProps,
				R.classIcon(item.c),
				item.c.name,
				tip
			),
			R.btn('<', () => {
				findNextOfThisType(item.c, -1);
			}, 'Find previous ' + item.c.name, 'tool-btn'),
			R.btn('>', () => {
				findNextOfThisType(item.c, 1);
			}, 'Find next ' + item.c.name, 'tool-btn')
			), item, key, this, 'components.' + item.c.name);
	}
	
	selectedItem() {
		if ((!editor.ClassesLoader.gameObjClasses) || (editor.ClassesLoader.gameObjClasses.indexOf(this.state.selectedItem) < 0)) return null;
		return this.state.selectedItem;
	}

	refresh() {
		if(this.refreshTimeout) {
			return;
		}
		this.refreshTimeout = setTimeout(() => {
			this.forceUpdate();
			this.refreshTimeout = null;
		}, 1);

	}
	
	render() {
		
		let body;
		
		let classes = editor.ClassesLoader.gameObjClasses;
		if (!classes) {
			body = 'Loading...';
		} else {
			body =  Group.groupArray(classes.map(this.renderItem));
			body.reverse();
		}
		
		let bottomPanelClassName = '';
		if (!this.selectedItem()) {
			bottomPanelClassName += ' disabled';
		}
		
		return R.fragment(
			R.div({className: 'classes-top-panel'},
				R.span({className: bottomPanelClassName},
					R.btn('Add', this.onAddClick, 'Add object to the scene.'),
					R.btn('Child', this.onAddAsChildClick, 'Add object as child of selected object.', undefined,undefined, !isCanBeAddedAsChild()),
					R.btn('Wrap', this.onWrapSelectedClick, 'Wrap each selected element on scene.')
				),
				R.btn('New', this.onNewComponentClick, 'Create new custom component.')
			),
			R.div(bodyProps, body)
		);
		
	}
}

function isCanBeAddedAsChild() {
	if(editor.selection.length !== 1) {
		return;
	}
	let o = editor.selection[0];
	if(!(o instanceof Container) || (o instanceof Tilemap)) {
		return;
	}
	return true;
}

function findNextOfThisType(c, direction) {
	if(game.keys.ctrlKey) {
		let a = game.currentContainer.findChildrenByType(c);
		if(game.currentContainer instanceof c) {
			a.push(game.currentContainer);
		}
		editor.selection.clearSelection();
		for (let w of a) {
			editor.ui.sceneTree.selectInTree(w, true);
		}
	} else {
		editor.ui.sceneTree.findNext((o) => {
			return o instanceof c;
			
		}, direction);
	}
}

export default ClassesView;