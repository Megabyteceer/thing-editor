import type { ComponentChild } from 'preact';
import { Component, render } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc } from 'thing-editor/src/editor/props-editor/editable';
import type { EditablePropertyEditorProps } from 'thing-editor/src/editor/ui/props-editor/props-field-wrapper';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { searchByRegexpOrText } from 'thing-editor/src/editor/utils/searc-by-regexp-or-text';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const CLASS_NAME = 'select-editor-current clickable';
const CLASS_NAME_DISABLED = 'select-editor-current disabled';

let openedList: ComponentChild | null;

interface SelectEditorItem<T = any> {
	name: string;
	value: T;
	visibleName?: ComponentChild;
}

//@ts-ignore //make "field" property optional
interface SelectEditorProps extends EditablePropertyEditorProps {
	field?: EditablePropertyDesc;
	noCopyValue?: boolean;
	select: (SelectEditorItem[]) | (() => SelectEditorItem[]);
}

interface SelectEditorState {
	toggled?: boolean;
	filter?: string;
}

class SelectEditor extends Component<SelectEditorProps, SelectEditorState> {

	filterName = '';
	checkForNeedClearFilter = true;
	selectedItem?: SelectEditorItem;

	focusFilter = false;

	constructor(props: SelectEditorProps) {
		super(props);
		if (this.props.field) {
			this.filterName = (this.props.field.filterName || this.props.field.name) + '-filter';
		}
		this.state = {};

		this.onToggle = this.onToggle.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.hide = this.hide.bind(this);
		this.onFilterChange = this.onFilterChange.bind(this);
		this.renderItem = this.renderItem.bind(this);
		this.onFocus = this.onFocus.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
	}

	componentWillUnmount() {
		this._hideList();
	}

	_hideList() {
		if (openedList === this) {
			render(R.fragment(), document.getElementById('select-lists-root') as HTMLElement);
			openedList = null;
		}
	}

	onFocus(event: PointerEvent) {
		(event.target as HTMLInputElement).select();
	}

	onMouseLeave() {
		this.hide();
	}

	hide() {
		if (this.state.toggled) {
			this.setState({
				toggled: false
			});
			this._hideList();
		}
	}

	onToggle() {
		if (!this.state.toggled && !this.props.disabled) {
			this.focusFilter = true;
			this.setState({
				toggled: true,
				filter: game.editor.settings.getItem(this.filterName, '')
			});
		}
	}

	onSelect(item: SelectEditorItem) {
		this.props.onChange(item.value);
		this.hide();
	}

	renderItem(i: SelectEditorItem) {
		return R.div({
			key: i.name,
			className: i === this.selectedItem ? 'select-item selected-item' : 'select-item clickable',
			onMouseDown: (ev: PointerEvent) => {
				sp(ev);
				this.onSelect(i);
			}
		}, i.visibleName || i.name);
	}

	onFilterChange(ev: InputEvent) {
		this.setFilter((ev.target as HTMLInputElement).value);
	}

	setFilter(flt: string) {
		game.editor.settings.setItem(this.filterName, flt);
		this.setState({
			filter: flt
		});
	}

	render() {

		let list = this.props.select || this.props.field!.select;
		if (typeof list === 'function') {
			list = list();
			if (list.length === 0) {
				return R.span({ className: 'danger' }, 'empty values list');
			}
		}
		let filterInput: ComponentChild;

		let item: SelectEditorItem | undefined | ComponentChild;

		if (this.props.hasOwnProperty('value')) {
			item = list.find((i) => {
				if (i.value === this.props.value) return i;
			});
			if (!item) {
				item = R.span({ className: 'danger' }, this.props.value);
				if (this.props.field && !this.props.field.isTranslatableKey) {
					window.setTimeout(() => {
						game.editor.ui.status.error('Invalid enum value: ' + this.props.value + ' ▾', 32002, game.editor.selection[0], this.props.field!.name);
					}, 1);
				}
			}
		}

		if (this.state.toggled) {
			if (this.focusFilter) {
				window.setTimeout(() => {
					let input = document.querySelector('#select-lists-root .select-editor-filter') as HTMLInputElement;
					if (input) {
						try {
							input.focus();
							input.setSelectionRange(0, input.value.length);
						} catch (_er) { } // eslint-disable-line no-empty
					}
				}, 10);
			}
			let a = list;
			if (this.props.field) {
				if (this.state.filter) {
					let flt = this.state.filter.toLocaleLowerCase();
					a = a.filter((i) => {
						return i === this.selectedItem || searchByRegexpOrText(i.name, flt) || (i.name === 'EMPTY') || !i.value;
					});
				}
				a = a.slice(0, 20);

			}

			filterInput = R.input({
				autoFocus: true,
				onFocus: this.onFocus,
				className: 'select-editor-filter',
				placeholder: 'Filter',
				onInput: this.onFilterChange,
				value: this.state.filter,
				style: this.props.field ? undefined : { display: 'none' }
			});

			if (this.checkForNeedClearFilter && a.length < 1) {
				this.checkForNeedClearFilter = false;
				window.setTimeout(() => {
					this.setFilter('');
				}, 1);
			}

			this.selectedItem = item as SelectEditorItem;

			window.setTimeout(() => {
				window.setTimeout(() => {
					let b = this.base as HTMLElement;
					if (b) {
						const bounds = b.getBoundingClientRect();
						let l = document.getElementById('select-list-content') as HTMLElement;
						if (l) {
							const height = Math.min(Math.round((window.innerHeight * 0.4)), l.clientHeight);
							if (bounds.top > window.innerHeight * 0.55) {
								bounds.y -= height - 25;
							}
							l.style.left = bounds.left + 'px';
							l.style.top = bounds.top + 'px';
							l.style.maxHeight = height + 'px';
						}
					}
				}, 0);
				openedList = this;

				render(R.div({
					className: 'select-editor-list',
					id: 'select-list-content',
					onMouseLeave: this.onMouseLeave
				}, filterInput, a.map(this.renderItem)), document.getElementById('select-lists-root') as HTMLElement);
			}, 0);
		}

		this.focusFilter = false;

		if (!item) {
			item = list[0];
		}

		return R.div({
			className: 'select-editor',
			onClick: this.onToggle
		},
		R.div({
			className: this.props.disabled ? CLASS_NAME_DISABLED : CLASS_NAME
		}, R.span({
			ctrlclickcopyvalue: this.props.noCopyValue ? undefined : ((typeof (item as SelectEditorItem).value === 'undefined') ? item : (item as SelectEditorItem).value),
			className: this.props.noCopyValue ? undefined : 'selectable-text',
			title: this.props.noCopyValue ? undefined : 'Ctrl+click to copy value.',
			onClick: stopPropagationIfCtrl,
			onMouseDown: copyTextByClick
		}, (item as SelectEditorItem).name ? (item as SelectEditorItem).name : item, ' ▾'))
		);
	}
}

const stopPropagationIfCtrl = (ev: MouseEvent) => {
	if (ev.ctrlKey) {
		sp(ev);
	}
};

export default SelectEditor;

export type { SelectEditorItem };

