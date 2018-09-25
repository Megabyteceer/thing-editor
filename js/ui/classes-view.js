import Group from "./group.js";
import Lib from "thing-engine/js/lib.js";
import game from "thing-engine/js/game.js";
import Scene from "thing-engine/js/components/scene.js";
import Container from "thing-engine/js/components/container.js";
import Tilemap from "thing-engine/js/components/tilemap.js";


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
		if(editor.selection.length < 1) {
			editor.ui.modal.showModal('Nothing selected to be wraped.', 'Alert');
		} else {
			let a = editor.selection.slice(0);

			let o = a[0];
			let parent = o.parent;
			let x = 0;
			let y = 0;

			for(let c of a) {
				if(c.parent !== parent) {
					editor.ui.modal.showModal('Alert', 'Selected object shoul have same parent to be wrapped.');
					return;
				}
				x += c.x;
				y += c.y;
			}
			x = Math.round(x / a.length);
			y = Math.round(y / a.length);

			if(o instanceof Scene) {
				editor.ui.modal.showModal('Scene can not be wrapped.', 'Alert');
				return;
			}
			editor.rememberPathReferences();
			let isPrefab = o === game.currentContainer;
			let prefabName = game.currentContainer.name;
			
			
			editor.selection.clearSelection();
			let w = ClassesView.loadSafeInstanceByClassName(this.state.selectedItem.c.name);
			w.x = 0;
			w.y = 0;
			
			let indexToAdd = parent.getChildIndex(o);

			for(let c of a) {
				w.addChild(c);
			}
			if(isPrefab) {
				w.name = prefabName;
				o.name = null;
				var data = Lib.__serializeObject(w);
				w = Lib._deserializeObject(data);
				game.__setCurrentContainerContent(w);
			} else {
				parent.addChildAt(w, indexToAdd);
			}
			Lib.__invalidateSerialisationCache(w);

			editor.moveContainerWithoutChildren(w, x, y);
			editor.validatePathReferences();
			editor.selection.clearSelection();
			editor.ui.sceneTree.selectInTree(w);
			editor.sceneModified(true);
		}
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
			), item, key, this);
	}
	
	selectedItem() {
		if ((!editor.ClassesLoader.gameObjClasses) || (editor.ClassesLoader.gameObjClasses.indexOf(this.state.selectedItem) < 0)) return null;
		return this.state.selectedItem;
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
			R.div({className: bottomPanelClassName}, R.btn('Add', this.onAddClick), R.btn('Add As Child', this.onAddAsChildClick, undefined, undefined,undefined, !isCanBeAddedAsChild()), R.btn('Wrap', this.onWrapSelectedClick, 'Wrap each selected element on scene.')),
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