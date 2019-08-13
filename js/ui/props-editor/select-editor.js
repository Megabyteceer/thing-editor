import PropsFieldWrapper from './props-field-wrapper.js';

class SelectEditor extends React.Component {

	constructor(props) {
		super(props);
		if (this.props.field) {
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
		this.onMouseDown = this.onMouseDown.bind(this);
	}

	onMouseDown(ev) {
		sp(ev);
		if (ev.buttons === 2) {
			editor.copyToClipboard(this.props.value);
		}
	}

	onMouseMove() {
		this.mouseLeaved = false;
	}

	onBlur() {
		this.isBlured = true;
		this.checkIfCanHide();
	}

	onFocus(event) {
		this.isBlured = false;
		event.target.select();
	}

	onMouseLeave() {
		this.mouseLeaved = true;
		this.checkIfCanHide();
	}

	checkIfCanHide() {
		if (this.isBlured && this.mouseLeaved) {
			this.hide();
		}
	}

	hide() {
		if (this.state.toggled) {
			this.setState({
				toggled: false
			});
		}
	}

	onToggle() {
		if (!this.state.toggled && !this.props.disabled) {
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
			key: i.name,
			className: 'select-item clickable',
			onMouseDown: (ev) => {
				sp(ev);
				this.onSelect(i);
			}
		}, i.name);
	}

	onFilterChange(ev) {
		this.setFilter(ev.target.value);
	}

	setFilter(flt) {
		editor.settings.setItem(this.filterName, flt);
		this.setState({
			filter: flt
		});
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
			if (this.props.field) {
				if (this.state.filter) {
					let flt = this.state.filter.toLocaleLowerCase();
					a = a.filter((i) => {
						return (i.name.toLowerCase().indexOf(flt) >= 0) || (i.name === "EMPTY") || !i.value;
					});
				}
				a = a.slice(0, 20);

			}

			filterInput = R.input({
				autoFocus: true,
				onBlur: this.onBlur,
				onFocus: this.onFocus,
				className: 'select-editor-filter',
				placeholder: 'Filter',
				onChange: this.onFilterChange,
				value: this.state.filter,
				style: this.props.field ? undefined : {width: 0, margin: 0, position:'fixed', padding: 0, height: 0}
			});

			if (this.checkForNeedClearFilter && a.length < 1) {
				this.checkForNeedClearFilter = false;
				setTimeout(() => {
					this.setFilter('');
				}, 1);
			}

			setTimeout(() => {
				let b = ReactDOM.findDOMNode(this.refs.body);
				if(b) {
					b = b.getBoundingClientRect();
					let l = ReactDOM.findDOMNode(this.refs.list);
					if(l) {
						l.style.left = b.left + 'px';
						l.style.top = b.top + 'px';
					}
				}

			}, 0);

			items = R.div({
				className: 'select-editor-list',
				ref: 'list'
			}, filterInput, a.map(this.renderItem));
		}

		let item;
		if (this.props.value) {
			item = list.find((i) => {
				if (i.value === this.props.value) return i;
			});
			if(!item) {
				item = R.span({className:'danger'}, this.props.value);
				if(!this.props.field.isTranslatableKey) {
					setTimeout(() => {
						editor.ui.status.error('Invalid enum value: ' + this.props.value + ' ▾', 30012, editor.selection[0], this.props.field.name);
					}, 1);
				}
			} else {
				item = item.name + ' ▾';
			}
		}

		if (!item) {
			item = list[0].name + ' ▾';
		}

		return R.div({
			className: 'select-editor',
			onClick: this.onToggle,
			onMouseMove: this.onMouseMove,
			onMouseLeave: this.onMouseLeave,
			onMouseDown: this.onMouseDown,
			ref: 'body'
		},
		R.div({
			className: 'select-editor-current clickable'
		}, item),
		items
		);
	}

}

export default SelectEditor;