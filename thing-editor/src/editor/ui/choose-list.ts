import { ClassAttributes, Component } from "preact";
import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import group from "thing-editor/src/editor/ui/group";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

let listProps = { className: 'list-view' };
let listHeaderProps = { className: 'choose-list-header' };
let bodyProps = { className: 'resizable-dialog left-align-text' };

interface ChooseListProps extends ClassAttributes<ChooseList> {
	list: ChooseListItem[];
	noSearchField: boolean;
	activeValue?: string;
}


interface ChooseListState {
	search: string
}

interface ChooseListItem {
	__EDITOR_icon?: string;
	__className?: string;
	pureName?: string;
	name: string;
	noFilter?: boolean;
	refusedBecause?: string;
}

export default class ChooseList extends Component<ChooseListProps, ChooseListState> {

	searchInputProps: any

	constructor(props: ChooseListProps) {
		super(props);
		this.state = { search: '' };
		this.searchInputProps = {
			autoFocus: true,
			onInput: this.onSearchChange.bind(this),
			onKeyDown: this.onKeyDown.bind(this),
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

	onKeyDown(ev: KeyboardEvent) {
		if((ev.keyCode === 13) && (this.list.length === 1)) {
			game.editor.ui.modal.hideModal(this.list[0]);
		}
	}

	renderChoosingItem(item: ChooseListItem, key: string) {
		assert((typeof item.name === 'string') || item.pureName || item.__className, "pureName property expected for non plain text named items.");

		let icon;
		if(item.__EDITOR_icon) {
			icon = R.classIcon(item as SourceMappedConstructor);
		}
		let name = item.__className || item.name;

		if(typeof name === 'string') {
			key = name;
		} else if(typeof key !== 'string') {
			key = '' + key;
		}

		let className = item.refusedBecause ? 'refused-item choosing-item' : 'clickable choosing-item';

		if(this.props.activeValue === name) {
			className += ' assets-item-current';
		}

		return R.div({
			onClick: () => {
				if(!item.refusedBecause) {
					game.editor.ui.modal.hideModal(item);
				}
			},
			title: item.refusedBecause,
			className,
			key: key
		}, icon, name);
	}

	get list() {
		if(this.state.search) {
			return this.props.list.filter(this.searchFilter);
		}

		return this.props.list;
	}

	searchFilter(item: ChooseListItem) {
		let f = this.state.search.toLocaleLowerCase();
		return item.noFilter || (item.__className || item.pureName || item.name).toLocaleLowerCase().indexOf(f) >= 0;
	}

	render() {
		return R.div(bodyProps,
			this.props.noSearchField ? undefined : R.div(listHeaderProps,
				R.input(this.searchInputProps),
				R.btn(R.icon('reject'), this.onSearchClearClick, 'Clear search')
			),
			R.div(listProps,
				group.groupArray(this.list.map(this.renderChoosingItem as any))
			)
		);
	}
}