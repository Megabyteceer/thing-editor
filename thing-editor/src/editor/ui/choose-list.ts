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
}

export default class ChooseList extends Component<ChooseListProps, ChooseListState> {

	searchInputProps: any

	constructor(props: ChooseListProps) {
		super(props);
		this.state = { search: '' };
		this.searchInputProps = {
			autoFocus: true,
			onChange: this.onSearchChange.bind(this),
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

	renderChoosingItem(i: ChooseListItem, key: string) {
		assert((typeof i.name === 'string') || i.pureName, "pureName property expected for non plain text named items.");

		let icon;
		if(i.__EDITOR_icon) {
			icon = R.classIcon(i as SourceMappedConstructor);
		}
		let name = i.name;

		if(typeof name === 'string') {
			key = name;
		}

		return R.div({
			onClick: () => {
				game.editor.ui.modal.hideModal(i);
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

	searchFilter(i: ChooseListItem) {
		let f = this.state.search.toLocaleLowerCase();
		return i.noFilter || (i.pureName || i.name).toLocaleLowerCase().indexOf(f) >= 0;
	}

	render() {
		return R.div(bodyProps,
			this.props.noSearchField ? undefined : R.div(listHeaderProps,
				R.input(this.searchInputProps),
				R.btn(R.icon('clear'), this.onSearchClearClick, 'Clear search')
			),
			R.div(listProps,
				group.groupArray(this.list.map(this.renderChoosingItem as any))
			)
		);
	}
}