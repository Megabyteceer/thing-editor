import { h } from 'preact';
import game from 'thing-editor/src/engine/game';
import R from '../preact-fabrics';
import type { ChooseListItem } from './choose-list';
import ChooseList from './choose-list';

const listProps = {
	className: 'filter-list'
};


class FilterList extends ChooseList {

	renderChoosingItem(item: ChooseListItem) {
		return R.div(
			{
				className: 'filter-list-item clickable',
				onClick: () => {
					item.unselected = !item.unselected;
					this.forceUpdate();
				},
				key: item.name
			},
			R.input({
				className: 'checkbox filter-list-checkbox',
				type: 'checkbox',
				checked: !item.unselected
			}),
			item.name
		);
	}

	render() {
		return R.div(
			listProps,
			R.div({
				className: 'filter-list-item clickable',
				onClick: () => {
					const checked = this.props.list.some(i => !i.unselected);
					for (let i of this.props.list) {
						i.unselected = checked;
					}
					this.forceUpdate();
				}
			},
			R.input({
				className: 'checkbox filter-list-checkbox',
				type: 'checkbox',
				checked: this.props.list.every(i => !i.unselected)
			}),
			'All'
			),
			super.render(),
			R.btn(
				'Cancel',
				() => {
					game.editor.ui.modal.hideModal(false);
				},
				undefined,
				undefined,
				{key: 'Escape'}
			),
			R.btn(
				this.props.list.every(i => i.unselected) ? 'Continue without assets copying' : 'Copy assets and continue',
				() => {
					game.editor.ui.modal.hideModal(this.props.list.filter((i) => !i.unselected));
				},
				undefined,
				'main-btn',
				{key: 'Enter'}
			)
		);
	}
}

export const showListFilter = (title:string, list:ChooseListItem[]):Promise<ChooseListItem[]> => {
	return game.editor.ui.modal.showModal(h(FilterList, { list, doNotGroup: true }), title, true);
};
