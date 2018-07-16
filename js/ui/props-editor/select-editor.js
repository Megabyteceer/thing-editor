import PropsFieldWrapper from './props-field-wrapper.js';

class SelectEditor extends React.Component {
	
	constructor(props) {
		super(props);
		if(this.props.field) {
			this.filterName = (this.props.field.filterName || this.props.field.name) + '-filter';
		}
		this.state = {};
		
		this.checkForNeedClearFilter = true;
		
		this.onToggle = this.onToggle.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.hide = this.hide.bind(this);
		this.onFilterChange = this.onFilterChange.bind(this);
		this.renderItem = this.renderItem.bind(this);
		this.onBlur = this.onBlur.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
	}
	
	onMouseMove() {
		this.mouseLeaved = false;
	}
	
	onBlur() {
		this.isBlured = true;
		this.checkIfCanHide();
	}
	
	onFocus() {
		this.isBlured = false;
	}
	
	onMouseLeave() {
		this.mouseLeaved = true;
		this.checkIfCanHide();
	}
	
	checkIfCanHide() {
		if(this.isBlured && this.mouseLeaved) {
			this.hide();
		}
	}
	
	hide() {
		if (this.state.toggled) {
			this.setState({toggled: false});
		}
	}
	
	onToggle() {
		if(!this.state.toggled && !this.props.disabled) {
			this.setState({
				toggled: true,
				filter: editor.settings.getItem(this.filterName, '')
			});
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
		this.setFilter(ev.target.value);
	}
	
	setFilter(flt) {
		editor.settings.setItem(this.filterName, flt);
		this.setState({filter: flt});
	}
	
	render() {
		
		let list = this.props.select || this.props.field.select;
		if (typeof list === "function") {
			list = list();
		}
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
				filterInput = R.input({autoFocus:true, onBlur:this.onBlur, onFocus:this.onFocus, className:'select-editor-filter', placeholder:'Filter', onChange: this.onFilterChange, value:this.state.filter});
			}
			
			if(this.checkForNeedClearFilter && a.length < 1) {
				this.checkForNeedClearFilter = false;
				setTimeout(() => {this.setFilter('');}, 1);
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
		
		return R.div({className: 'select-editor',
			onClick: this.onToggle,
			onMouseMove:this.onMouseMove,
			onMouseLeave:this.onMouseLeave
		},
		R.div({className: 'select-editor-current clickable'}, item.name + ' ▾'),
		items
		);
	}
	
}

export default SelectEditor;