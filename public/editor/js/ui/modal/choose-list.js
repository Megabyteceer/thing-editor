var listProps = {className:'list-view'};
var bodyProps = {className:'resizable-dialog left-align-text'};

export default class ChooseList extends React.Component {
	
	
	constructor(props) {
		super(props);
		this.state = {search: ''};
		this.searchInputProps = {
			onChange: this.onSearchChange.bind(this),
			onKeyDown:this.onKeyDown.bind(this),
			placeholder: 'Search'
		};
		this.onSearchCliearClick = this.onSearchCliearClick.bind(this);
		this.renderChoosingItem = this.renderChoosingItem.bind(this);
		this.searchFilter = this.searchFilter.bind(this);
	}
	
	onSearchChange(ev) {
		var val = ev.target.value;
		this.setState({search: val});
	}
	
	onSearchCliearClick() {
		this.setState({search: ''});
	}
	
	onKeyDown(ev) {
		if((ev.keyCode === 13) && (this.list.leading === 1)) {
			editor.ui.modal.closeModal(this.list[0]);
		}
	}
	
	renderChoosingItem(i, key) {
		var icon;
		if(i.EDITOR_icon) {
			icon = R.classIcon(i);
		}
		var name = i.name;
		return R.div({
			onMouseDown: ()=>{
				editor.ui.modal.closeModal(i)
			},
			className: 'clickable choosing-item',
			key: key
		}, icon, name);
	}
	
	get list() {
		if(this.state.search) {
			return this.props.list.filter(this.searchFilter);
		}
		
		return this.props.list;
	}
	
	searchFilter(i) {
		var f = this.state.search.toLocaleLowerCase();
		return i.name.toLocaleLowerCase().indexOf(f) >= 0;
	}
	
	render() {
		return R.div(bodyProps,
			R.input(this.searchInputProps),
			R.btn(R.icon('clear'), this.onSearchCliearClick),
			R.div(listProps,
				this.list.map(this.renderChoosingItem)
			)
		);
	}
}