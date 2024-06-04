import type { ComponentChild } from 'preact';
import { h, type ClassAttributes } from 'preact';
import game from 'thing-editor/src/engine/game';
import R from '../preact-fabrics';
import ComponentDebounced from '../ui/component-debounced';
import showContextMenu from '../ui/context-menu';
import Window from '../ui/editor-window';
import MainMenu from '../ui/main-menu';
import SelectEditor from '../ui/props-editor/props-editors/select-editor';
import { hideAdditionalWindow, showAdditionalWindow } from '../ui/ui';
import { editorEvents } from './editor-events';
import sp from './stop-propagation';

enum DataAccessDebuggerMode {
	EQUAL = 'EQUAL',
	LESS = 'LESS',
	BIGGER = 'BIGGER',
	NOT_EQUAL = 'NOT_EQUAL',
	ANY = 'ANY',
}

const MODE_SELECT_LIST = [
	{ name: 'EQUAL', value: DataAccessDebuggerMode.EQUAL },
	{ name: 'LESS', value: DataAccessDebuggerMode.LESS },
	{ name: 'BIGGER', value: DataAccessDebuggerMode.BIGGER },
	{ name: 'NOT_EQUAL', value: DataAccessDebuggerMode.NOT_EQUAL },
	{ name: 'ANY', value: DataAccessDebuggerMode.ANY }
];

interface DataAccessDebugEntry {
	propertyName: string;
	mode: DataAccessDebuggerMode;
	rawValue: string;
	parsedValue: any;
	stringifiedValue: any;

	enabled: boolean;
}

interface DataAccessDebuggerState {
	debugEntries: DataAccessDebugEntry[];
}

let instance: DataAccessDebugger | null;

export default class DataAccessDebugger extends ComponentDebounced<ClassAttributes<DataAccessDebugger>, DataAccessDebuggerState> {

	static gameData: GameData;
	static gameDataProxy: GameData;

	static initializeGameData() {
		this.gameData = {} as any;
		this.gameDataProxy = new Proxy(this.gameData, DataAccessDebugger.handler) as any;
		this.applyDataToGame();
	}

	private static applyDataToGame() {
		if (instance && instance.state.debugEntries.some(e => e.enabled)) {
			game.data = DataAccessDebugger.gameDataProxy;
		} else {
			game.data = DataAccessDebugger.gameData;
		}
		if (instance) {
			game.editor.settings.setItem('debug-data-access', instance.state.debugEntries);
			instance.refresh();
		}
	}

	static refresh() {
		if (instance) {
			instance.refresh();
		}
	}

	static toggle() {
		game.editor.settings.setItem('data-access-debugger-shown', !instance);
		if (!instance) {
			showAdditionalWindow('data-access-debugger', 'data-access-debugger', 'game.data access debugger', h(DataAccessDebugger, null), 40, 70, 100, 100, 300, 100);
			Window.bringWindowForward('#data-access-debugger');
		} else {
			hideAdditionalWindow('data-access-debugger');
		}
	}

	static handler = {
		set: setData_thing_editor_debug_helper,
		deleteProperty: deleteProperty_thing_editor_debug_helper
	};

	constructor() {
		super();
		this.state = {debugEntries: game.editor.settings.getItem('debug-data-access', [])};
	}

	componentDidMount(): void {
		instance = this;
	}

	componentWillUnmount(): void {
		instance = null;
		DataAccessDebugger.applyDataToGame();
	}

	renderDebugEntry(item: DataAccessDebugEntry) {
		return R.div({
			className: item.enabled ? 'data-access-debugger-item' : 'data-access-debugger-item semi-transparent',
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showContextMenu([
					{
						name: 'Delete',
						onClick: () => {
							instance?.state.debugEntries.splice(instance?.state.debugEntries.indexOf(item), 1);
							DataAccessDebugger.applyDataToGame();
						}
					}
				], ev);
			},
		},
		R.input({
			placeholder: 'Property name',
			onInput: (ev: Event) => {
				item.propertyName = ((ev.target as any).value as string).trim();
				DataAccessDebugger.applyDataToGame();
			},
			value: item.propertyName
		}),
		h(SelectEditor, {
			value: item.mode,
			noCopyValue: true,
			onChange: (value : DataAccessDebuggerMode) => {
				item.mode = value;
				DataAccessDebugger.applyDataToGame();
			},
			select: MODE_SELECT_LIST }
		),
		R.input({
			placeholder: 'value',
			onInput: (ev: Event) => {
				let currentValue = (ev.target as any).value;
				try {
					item.parsedValue = JSON.parse(currentValue);
				} catch (_er) {
					item.parsedValue = currentValue;
				}
				item.stringifiedValue = JSON.stringify(item.parsedValue);
				item.rawValue = currentValue;

				DataAccessDebugger.applyDataToGame();
			},
			value: item.rawValue
		}),
		R.input({
			title: 'Enabled',
			onChange: (ev: InputEvent) => {
				item.enabled = (ev.target as HTMLInputElement).checked;
				DataAccessDebugger.applyDataToGame();
			},
			type: 'checkbox',
			checked: item.enabled
		})
		);
	}

	render(): ComponentChild {
		return R.div(
			{
				className: 'data-access-debugger window-scrollable-content'
			},
			R.btn('×', DataAccessDebugger.toggle, 'Hide data access debugger', 'close-window-btn', {key: 'Escape'}),
			this.state.debugEntries.map(this.renderDebugEntry),
			R.div(null, R.btn('+ Add debug entry', () => {
				instance!.state.debugEntries.push({
					enabled: true,
					propertyName: '',
					mode: DataAccessDebuggerMode.EQUAL,
					parsedValue: '',
					rawValue: '',
					stringifiedValue: '""'
				});
				DataAccessDebugger.applyDataToGame();
			}))
		);
	}
}

editorEvents.on('projectDidOpen', () => {
	if (game.editor.settings.getItem('data-access-debugger-shown')) {
		DataAccessDebugger.toggle();
	}
});

function deleteProperty_thing_editor_debug_helper(data:any, prop:any):any {
	for (const item of instance!.state.debugEntries) {
		if ((prop === item.propertyName) && ((item.mode === DataAccessDebuggerMode.ANY) || (typeof item.parsedValue === 'undefined'))) {
			debugger; // access to data detected
		}
	}

	delete data[prop];
	return true;
}

function setData_thing_editor_debug_helper(data:any, prop:any, val:any):any {
	let valueParsed = false;
	let valueToCompare;

	for (const item of instance!.state.debugEntries) {
		if (prop === item.propertyName) {
			if (!item.rawValue) {
				debugger; // access to data detected
			}

			if (!valueParsed) {
				valueToCompare = val;
				if (val && typeof val === 'object') {
					try {
						valueToCompare = JSON.stringify(JSON.parse(val));
					} catch (_er) {}
				}
				valueParsed = true;
			}

			switch (item.mode) {
			case DataAccessDebuggerMode.ANY:
				debugger; // access to data detected
				break;
			case DataAccessDebuggerMode.EQUAL:
				if (valueToCompare == item.parsedValue || valueToCompare == item.stringifiedValue) {
					debugger; // access to data detected
				}
				break;
			case DataAccessDebuggerMode.NOT_EQUAL:
				if (valueToCompare != item.parsedValue && valueToCompare != item.stringifiedValue) {
					debugger; // access to data detected
				}
				break;
			case DataAccessDebuggerMode.BIGGER:
				if (valueToCompare > item.parsedValue) {
					debugger; // access to data detected
				}
				break;
			case DataAccessDebuggerMode.LESS:
				if (valueToCompare < item.parsedValue) {
					debugger; // access to data detected
				}
				break;
			}
		}
	}

	data[prop] = val;
	return true;
}

MainMenu.injectMenu('project', [
	{
		name: 'Debug game.data access...',
		onClick: () => {
			DataAccessDebugger.toggle();
		}
	}
], 'debug-data-access', -1);
