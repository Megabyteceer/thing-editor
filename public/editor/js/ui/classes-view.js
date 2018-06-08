import Group from "./group.js";


const bodyProps = {className: 'list-view'};
const classItemProps = {className: 'class-list-item'};
const classItemSubProps = {className: 'class-list-item-sub'};

class ClessesView extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.renderItem = this.renderItem.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddAsChildClick = this.onAddAsChildClick.bind(this);
		this.onWrapSelectedClick = this.onWrapSelectedClick.bind(this);
	}
	
	onAddClick() {
		editor.addToScene(Lib._loadClassInstanceById(this.state.selectedItem.c.name));
	}
	
	onAddAsChildClick() {
		editor.attachToSelected(Lib._loadClassInstanceById(this.state.selectedItem.c.name));
	}
	
	onWrapSelectedClick() {
		if(editor.selection.length < 1) {
			editor.ui.modal.showModal('Alert', 'Nothing selected to wrap.')
		} else {
			let a = editor.selection.slice(0);
			editor.selection.clearSelection();
			let wasModified = false;
			a.some((o) => {
				if(o.parent === game.stage) {
					editor.ui.modal.showModal('Alert', 'Root element was not wrapped.')
				} else {
					let w = Lib._loadClassInstanceById(this.state.selectedItem.c.name);
					o.parent.addChildAt(w, o.parent.getChildIndex(o));
					w.addChild(o);
					w.x = o.x;
					w.y = o.y;
					o.x = 0;
					o.y = 0;
					
					editor.ui.sceneTree.selectInTree(w, true);
					wasModified =true;
				}
			});
			if(wasModified) {
				editor.sceneModified(true);
			}
		}
	}
	
	onSelect(item) {
	
	}
	
	renderItem(item) {
		let tip;
		if(item.c.EDITOR_tip) {
			tip = R.tip('class-' + item.c.name,
				'Component "' + item.c.name + '" description:',
				item.c.EDITOR_tip
			);
		}
		
		let key;
		if(item.c.hasOwnProperty('EDITOR_group')) {
			key = item.c.EDITOR_group + '/' + item.c.name;
		} else {
			key = 'Custom/' + item.c.name;
		}
		
		return R.listItem(
			R.div(classItemProps,
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
			body = 'Loading...'
		} else {
			body =  Group.groupArray(classes.map(this.renderItem));
			body.reverse();
		}
		
		let bottomPanelClassName = '';
		if (!this.selectedItem()) {
			bottomPanelClassName += ' disabled';
		}
		
		return R.fragment(
			R.div({className: bottomPanelClassName}, R.btn('Add', this.onAddClick), R.btn('Add As Child', this.onAddAsChildClick), R.btn('Wrap', this.onWrapSelectedClick, 'Wrap each selected element on scene.')),
			R.div(bodyProps, body)
		)
		
	}
}


function findNextOfThisType(c, direction) {
	editor.ui.sceneTree.findNext((o) => {
		return o instanceof c;
		
	}, direction);
}

export default ClessesView;