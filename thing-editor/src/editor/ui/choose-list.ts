import type { ClassAttributes, ComponentChild } from 'preact';
import { Component } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import group from 'thing-editor/src/editor/ui/group';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

let listProps = { className: 'list-view' };
let listHeaderProps = { className: 'choose-list-header' };
let bodyProps = { className: 'resizable-dialog left-align-text' };

interface ChooseListProps extends ClassAttributes<ChooseList> {
	list: ChooseListItem[];
	noSearchField: boolean;
	activeValue?: string;
	doNotGroup?: boolean;
}


interface ChooseListState {
	search: string;
}

interface ChooseListItem {
	__EDITOR_icon?: string;
	__className?: string;
	pureName?: string;
	name: ComponentChild;
	noFilter?: boolean;
	refusedBecause?: string;
}

export type { ChooseListItem };

export default class ChooseList extends Component<ChooseListProps, ChooseListState> {

	searchInputProps: any;

	constructor(props: ChooseListProps) {
		super(props);
		this.state = { search: '' };
		this.searchInputProps = {
			autoFocus: true,
			onInput: this.onSearchChange.bind(this),
			placeholder: 'Search'
		};
		this.onSearchClearClick = this.onSearchClearClick.bind(this);
		this.renderChoosingItem = this.renderChoosingItem.bind(this);
		this.searchFilter = this.searchFilter.bind(this);
	}

	onSearchChange(ev: PointerEvent) {
		let val = (ev.target as HTMLInputElement).value;
		this.setState({ search: val });
	}

	onSearchClearClick() {
		this.setState({ search: '' });
	}

	renderChoosingItem(item: ChooseListItem, key: string) {
		assert((typeof item.name === 'string') || item.pureName || item.__className, 'pureName property expected for non plain text named items.');

		let icon;
		if (item.__EDITOR_icon) {
			icon = R.classIcon(item as SourceMappedConstructor);
		}
		let name = item.__className || item.name;

		if (typeof name === 'string') {
			key = name;
		} else if (typeof key !== 'string') {
			key = '' + key;
		}

		const isCurrentItem = this.props.activeValue === (item.pureName || item.name);

		let className = item.refusedBecause ? 'refused-item choosing-item' : (isCurrentItem ? 'choosing-item assets-item-current' : 'clickable choosing-item');

		return R.div({
			onClick: isCurrentItem ? undefined : () => {
				if (!item.refusedBecause) {
					game.editor.ui.modal.hideModal(item);
				}
			},
			title: item.refusedBecause,
			className,
			key: key
		}, icon, name);
	}

	get list() {
		if (this.state.search) {
			return this.props.list.filter(this.searchFilter);
		}

		return this.props.list;
	}

	searchFilter(item: ChooseListItem) {
		let f = this.state.search.toLocaleLowerCase();
		return item.noFilter || ((item.__className || item.pureName || item.name) as string).toLocaleLowerCase().indexOf(f) >= 0;
	}

	render() {

		let list: any = this.list.map(this.renderChoosingItem as any);
		if (!this.props.doNotGroup) {
			list = group.groupArray(list);
		}

		return R.div(bodyProps,
			this.props.noSearchField ? undefined : R.div(listHeaderProps,
				R.input(this.searchInputProps),
				R.btn(R.icon('reject'), this.onSearchClearClick, 'Clear search')
			),
			R.btn('auto accept', (ev) => {
				if (this.list.length >= 1) {
					if ((this.list[0] as any).noAutoSelect) {
						if (this.list.length >= 2) {
							game.editor.ui.modal.hideModal(this.list[1]);
							sp(ev);
						}
					} else {

						game.editor.ui.modal.hideModal(this.list[0]);
						sp(ev);

					}
				}
			}, undefined, 'hidden', { key: 'Enter' }),
			R.div(listProps, list)
		);
	}
}
