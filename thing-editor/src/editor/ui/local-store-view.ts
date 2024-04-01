import type { ClassAttributes, ComponentChild } from 'preact';
import { h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import Window from 'thing-editor/src/editor/ui/editor-window';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import game from 'thing-editor/src/engine/game';

let instance: LocalStoreView | null;

const LIST_PROPS = { className: 'window-scrollable-content local-store-view' };
const ROW_PROPS = { className: 'local-store-row' };

const HEADER_COLUMN_PROPS = {
	className: 'selectable-text local-store-column local-store-column-header',
	title: 'Ctrl+click to copy',
	onMouseDown: copyTextByClick
};

const COLUMN_PROPS = {
	className: 'selectable-text local-store-column',
	title: 'Ctrl+click to copy',
	onMouseDown: copyTextByClick
};

interface LocalStoreViewState {
	filter?: string;
}

export default class LocalStoreView extends ComponentDebounced<ClassAttributes<LocalStoreView>, LocalStoreViewState> {

	searchInputProps = {
		className: 'local-store-search-input',
		onInput: this.onSearchChange.bind(this),
		placeholder: 'Search',
		value: ''
	};

	static refresh() {
		if (instance) {
			instance.refresh();
		}
	}

	static toggle() {
		if (!instance) {
			showAdditionalWindow('language-view', 'language-view', 'Localization', h(LocalStoreView, null), 40, 0, 100, 70, 600, 300);
			Window.bringWindowForward('#language-view');
		} else {
			hideAdditionalWindow('language-view');
		}
	}

	componentDidMount(): void {
		instance = this;
	}

	componentWillUnmount(): void {
		instance = null;
	}

	onSearchChange(ev: InputEvent) {
		this.searchInputProps.value = (ev.target as any).value;
		this.setState({ filter: (ev.target as any).value.toLowerCase() });
	}

	render(): ComponentChild {
		const list = [];

		let filter = this.state.filter;

		for (const key in game.settings.data) {

			const val = JSON.stringify(game.settings.data[key]);
			if (filter) {
				if (!key.toLocaleLowerCase().includes(filter) && !val.toLocaleLowerCase().includes(filter)) {
					continue;
				}
			}
			list.push(R.div(ROW_PROPS,
				R.span(HEADER_COLUMN_PROPS, key),
				R.span(COLUMN_PROPS, val),
				R.btn('×', () => {
					game.settings.removeItem(key);
					this.refresh();
				})
			));
		}


		return R.fragment(
			R.btn('×', LocalStoreView.toggle, 'Hide Local Store View', 'close-window-btn', {key: 'Escape'}),
			R.input(this.searchInputProps),
			R.div(
				LIST_PROPS,
				list
			),
			R.btn(R.fragment('Clear local store', R.icon('delete')), () => {
				game.editor.ui.modal.showEditorQuestion('Are you sure?', 'You about to remove game\'s local store data.', () => {
					game.settings.clear();
					this.refresh();
				}, R.fragment('Clear ', R.icon('delete')));
			})
		);
	}
}
