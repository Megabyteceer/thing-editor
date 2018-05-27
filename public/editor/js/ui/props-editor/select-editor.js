import PropsFieldWrapper from './props-field-wrapper.js';

class SelectEditor extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {filter: editor.settings.getItem(this.props.field.name + '-filter', '')};
		
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
		if(!this.state.toggled) {
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
		var val = ev.target.value;
		editor.settings.setItem(this.props.field.name + '-filter', val);
		this.setState({filter: val});
	}
	
	render() {
		
		var list = this.props.select || this.props.field.select;
		
		var items;
		
		if (this.state.toggled) {
			var a = list;
			if(this.state.filter) {
				var flt = this.state.filter.toLocaleLowerCase();
				a = a.filter((i) => {
					return i.name.toLowerCase().indexOf(flt) >= 0;
				});
			}
			
			a = a.slice(0, 20);
			items = R.div({className: 'select-editor-list'},R.input({className:'select-editor-filter', placeholder:'Filter', onChange: this.onFilterChange, value:this.state.filter}), a.map(this.renderItem));
		}
		
		var item;
		if(!this.props.value) {
			item = list[0];
		}
		else {
			item = list.find((i) => {
				if (i.value === this.props.value) return i;
			});
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