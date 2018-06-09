import PropsFieldWrapper from './props-field-wrapper.js';

class SelectEditor extends React.Component {
	
	constructor(props) {
		super(props);
		if(this.props.field) {
			this.state = {filter: editor.settings.getItem(this.props.field.name + '-filter', '')};
		} else {
			this.state = {};
		}
		
		this.onToggle = this.onToggle.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.hide = this.hide.bind(this);
		this.onFilterChange = this.onFilterChange.bind(this);
		this.renderItem = this.renderItem.bind(this);
	}
	
	hide() {
		if (this.state.toggled) {
			this.setState({toggled: false});
		}
	}
	
	onToggle() {
		if(!this.state.toggled && !this.props.disabled) {
			this.setState({toggled: true});
		}
	}
	
	onSelect(item) {
		this.props.onChange(PropsFieldWrapper.surrogateChnageEvent(item.value));
		this.hide();
	}
	
	renderItem(i) {
		return R.div({
			key: i.name, className: 'select-item clickable', onClick: () => {
				this.onSelect(i);
			}
		}, i.name);
	}
	
	onFilterChange(ev) {
		let val = ev.target.value;
		editor.settings.setItem(this.props.field.name + '-filter', val);
		this.setState({filter: val});
	}
	
	render() {
		
		let list = this.props.select || this.props.field.select;
		
		let items;
		let filterInput;
		
		if (this.state.toggled) {
			let a = list;
			if(this.props.field) {
				if(this.state.filter) {
					let flt = this.state.filter.toLocaleLowerCase();
					a = a.filter((i) => {
						return i.name.toLowerCase().indexOf(flt) >= 0;
					});
				}
				a = a.slice(0, 20);
				filterInput = R.input({className:'select-editor-filter', placeholder:'Filter', onChange: this.onFilterChange, value:this.state.filter});
			}
			
			
			
			items = R.div({className: 'select-editor-list'}, filterInput, a.map(this.renderItem));
		}
		
		let item;
		if(this.props.value) {
			item = list.find((i) => {
				if (i.value === this.props.value) return i;
			});
		}

		if(!item) {
			item = list[0];
		}
		
		return R.div({className: 'select-editor', onClick: this.onToggle
				, onMouseLeave:this.hide
			},
			R.div({className: 'select-editor-current clickable'}, item.name + ' ▾'),
			items
		);
	}
	
}

export default SelectEditor