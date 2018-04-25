var classViewProps = {className: 'vertical-layout'};
var bodyProps = {className: 'list-view'};

class ClessesView extends React.Component {
	
	constructor(props) {
		super(props);
		EDITOR.ClassesLoader.classesLoaded.add(this.onClassesLoaded.bind(this));
		this.state = {};
		this.renderItem = this.renderItem.bind(this);
		this.onAddClick = this.onAddClick.bind(this);
		this.onAddAsChildClick = this.onAddAsChildClick.bind(this);
	}
	
	onClassesLoaded() {
		this.forceUpdate();
	}
	
	onAddClick() {
		EDITOR.addToScene(Lib.loadClassInstanceById(this.state.selectedItem.c.name));
	}
	
	onAddAsChildClick() {
		EDITOR.addToSelected(Lib.loadClassInstanceById(this.state.selectedItem.c.name));
	}
	
	onSelect(item) {
	
	}
	
	renderItem(item) {
		return R.listItem(R.span(null, R.classIcon(item.c), item.c.name), item, item.c.name, this);
	}
	
	selectedItem() {
		if ((!EDITOR.ClassesLoader.gameObjClasses) || (EDITOR.ClassesLoader.gameObjClasses.indexOf(this.state.selectedItem) < 0)) return null;
		return this.state.selectedItem;
	}
	
	render() {
		
		var body;
		
		var classes = EDITOR.ClassesLoader.gameObjClasses;
		if (!classes) {
			body = 'Loading...'
		} else {
			body = classes.map(this.renderItem);
		}
		
		var bottomPanelClassName = '';
		if (!this.selectedItem()) {
			bottomPanelClassName += ' disabled';
		}
		
		return R.div(classViewProps,
			R.div({className: bottomPanelClassName}, R.btn('Add', this.onAddClick), R.btn('Add As Child', this.onAddAsChildClick)),
			R.div(bodyProps, body)
		)
		
	}
}

export default ClessesView;