var bodyProps = {className: 'list-view'};

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
			var a = editor.selection.slice(0);
			editor.selection.clearSelection();
			var wasModified = false;
			a.some((o) => {
				if(o.parent === game.stage) {
					editor.ui.modal.showModal('Alert', 'Root element was not wrapped.')
				} else {
					var w = Lib._loadClassInstanceById(this.state.selectedItem.c.name);
					o.parent.addChildAt(w, o.parent.getChildIndex(o));
					w.addChild(o);
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
		return R.listItem(R.span(null, R.classIcon(item.c), item.c.name), item, item.c.name, this);
	}
	
	selectedItem() {
		if ((!editor.ClassesLoader.gameObjClasses) || (editor.ClassesLoader.gameObjClasses.indexOf(this.state.selectedItem) < 0)) return null;
		return this.state.selectedItem;
	}
	
	render() {
		
		var body;
		
		var classes = editor.ClassesLoader.gameObjClasses;
		if (!classes) {
			body = 'Loading...'
		} else {
			body = classes.map(this.renderItem);
		}
		
		var bottomPanelClassName = '';
		if (!this.selectedItem()) {
			bottomPanelClassName += ' disabled';
		}
		
		return R.fragment(
			R.div({className: bottomPanelClassName}, R.btn('Add', this.onAddClick), R.btn('Add As Child', this.onAddAsChildClick), R.btn('Wrap', this.onWrapSelectedClick, 'Wrap each selected element on scene.')),
			R.div(bodyProps, body)
		)
		
	}
}

export default ClessesView;