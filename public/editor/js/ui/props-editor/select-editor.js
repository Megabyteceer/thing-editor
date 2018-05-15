import PropsFieldWrapper from './props-field-wrapper.js';

class SelectEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		
		this.onToggle = this.onToggle.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.onMouseOut = this.onMouseOut.bind(this);
		this.renderItem = this.renderItem.bind(this);
	}
	
	onMouseOut() {
		if (this.state.toggled) {
			this.onToggle();
		}
	}
	
	onToggle() {
		this.setState({toggled: !this.state.toggled});
	}
	
	onSelect(item) {
		this.props.onChange(PropsFieldWrapper.surrogateChnageEvent(item.value));
	}
	
	renderItem(i) {
		return R.div({
			key: i.name, className: 'select-item clickable', onClick: () => {
				this.onSelect(i);
			}
		}, i.name);
	}
	
	render() {
		
		var list = this.props.select || this.props.field.select;
		
		var items;
		
		if (this.state.toggled) {
			items = R.div({className: 'select-editor-list'}, list.map(this.renderItem));
		}
		
		var item;
		if(!this.props.value) {
			item = list[0];
		}
		else {
			item = list.find((i) => {
				if (i.value === this.props.value) return i
			});
		}
		
		return R.div({className: 'select-editor', onClick: this.onToggle/*, onMouseOut:this.onMouseOut*/},
			R.div({className: 'select-editor-current clickable'}, item.name + ' ▾'),
			items
		);
	}
	
}

export default SelectEditor