import type { Container } from 'pixi.js';
import type { ClassAttributes, ComponentChild } from 'preact';
import { h } from 'preact';

import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import Window from 'thing-editor/src/editor/ui/editor-window';
import MainMenu from 'thing-editor/src/editor/ui/main-menu';
import { hideAdditionalWindow, showAdditionalWindow } from 'thing-editor/src/editor/ui/ui';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import game from 'thing-editor/src/engine/game';
import copyTextByClick from '../utils/copy-text-by-click';
import { searchByRegexpOrText } from '../utils/search-by-regexp-or-text';

/// 99999

interface LabelsLoggerProps extends ClassAttributes<LabelsLogger> {
}

let listProps = {
	className: 'window-scrollable-content labels-log-list',
};

interface LabelsLoggerState {
	search: string;
}

interface LabelLogItem {
	label: string;
	root: Container;
	_rootId: number;
}


let labelNamesProps = {
	className: 'selectable-text',
	title: 'Ctrl+click to copy label`s name',
	onMouseDown: copyTextByClick
};


const log: LabelLogItem[] = [];

let instance: LabelsLogger;

export default class LabelsLogger extends ComponentDebounced<LabelsLoggerProps, LabelsLoggerState> {

	searchInputProps: KeyedObject;
	constructor(props: LabelsLoggerProps) {
		super(props);

		this.searchInputProps = {
			className: 'search-input',
			onInput: this.onSearchChange.bind(this),
			placeholder: 'Search'
		};
	}

	onSearchChange(ev: InputEvent) {
		let search = (ev.target as HTMLInputElement).value.toLowerCase();
		this.setState({ search });
	}

	clearSearch() {
		this.setState({search: undefined});
	}

	static logGotoLabelRecursive(label: string, root:Container) {
		if (instance) {
			log.push({label, root, _rootId: root.___id});
			if (log.length > 1100) {
				log.splice(0, 100);
			}
			instance.refresh();
		}
	}

	componentDidMount(): void {
		instance = this;
	}

	componentWillUnmount(): void {
		instance = null!;
	}

	renderItem(item: LabelLogItem) {
		const isRemoved = item._rootId !== item.root.___id;

		return R.div({
			className: isRemoved ? 'labels-log-item disabled' : 'labels-log-item',
			onClick: isRemoved ? undefined : () => {
				game.editor.selection.select(item.root);
			}
		},
		R.span(labelNamesProps, item.label),
		R.sceneNode(item.root)
		);
	}

	render(): ComponentChild {
		let list = log;
		if (this.state.search) {
			list = log.filter((item) => {
				if (searchByRegexpOrText(item.label, this.state.search)) {
					return true;
				}
				if (item._rootId === item.root.___id) {
					if (searchByRegexpOrText(item.root.name || '', this.state.search)) {
						return true;
					}
					if (searchByRegexpOrText((item.root.constructor as SourceMappedConstructor).__className!, this.state.search)) {
						return true;
					}
				}
			});
		}

		return R.fragment(
			R.btn('×', LabelsLogger.toggle, 'Hide label logger', 'close-window-btn', { key: 'Escape' }),

			R.input(this.searchInputProps),
			R.btn('×', this.clearSearch, 'Discard search filter', 'close-btn clear-search-btn'),

			R.div(listProps,
				list.map(this.renderItem)
			),
			R.btn(R.fragment('CLEAR', R.icon('delete')), clearLog, undefined, 'danger', undefined, !log.length)
		);
	}

	static toggle() {
		game.editor.settings.setItem('labels-logger-shown', !game.editor.settings.getItem('labels-logger-shown'));
		LabelsLogger.renderWindow();
	}

	static renderWindow() {
		if (game.editor.settings.getItem('labels-logger-shown')) {
			LabelsLogger.show();
		} else {
			LabelsLogger.hide();
		}
	}

	static show() {
		showAdditionalWindow('labels-logger', 'LabelsLogger', 'Labels Logger',
			h(LabelsLogger, null),
			50, 50, 80, 80, 300, 200);
		Window.bringWindowForward('#labels-logger');
	}

	static hide() {
		hideAdditionalWindow('labels-logger');
	}
}

window.setTimeout(LabelsLogger.renderWindow, 100,);

function clearLog() {
	log.length = 0;
	instance?.refresh();
}

editorEvents.on('playToggle', clearLog);

MainMenu.injectMenu('settings', [{
	name: () => {
		return R.span(null, R.span({ className: '.menu-icon' }, game.editor.settings.getItem('labels-logger-shown') ? '☑' : '☐'), ' Labels logger');
	},
	onClick: () => {
		LabelsLogger.toggle();
	},
	stayAfterClick: true
}], 'labels-logger', -1);
