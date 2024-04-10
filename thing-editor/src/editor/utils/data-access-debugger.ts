import game from 'thing-editor/src/engine/game';
import MainMenu from '../ui/main-menu';

export default class DataAccessDebugger {

	static handler = {
		set: setData,
		deleteProperty
	};

	static breakOnDataPropertySet(propertyName:string, value?:any) {
		debugPropertyName = propertyName;
		debugPropertyValue = value;
		try {
			debugPropertyValue = JSON.parse(value);
		} catch (_er) {}
	}
}

let debugPropertyName:string;
let debugPropertyValue:string;

function deleteProperty(data:any, prop:any):any {
	if (typeof debugPropertyValue === 'undefined') {
		debugger; // access to data detected
	}

	delete data[prop];
	return true;

}

function setData(data:any, prop:any, val:any):any {
	if (prop === debugPropertyName) {
		if ((typeof debugPropertyValue === 'undefined') || val == debugPropertyValue) {
			debugger;
		}
	}
	data[prop] = val;
	return true;
}

MainMenu.injectMenu('project', [
	{
		name: 'Debug game.data access',
		onClick: () => {
			game.editor.ui.modal.showPrompt('Enter data.property name', game.editor.settings.getItem('debug-data-property-name')).then((propertyName:string) => {
				debugPropertyName = propertyName;
				if (propertyName) {
					game.editor.settings.setItem('debug-data-property-name', propertyName);
					let currentValue = '' + ((game.data as any)[debugPropertyName as string] as any);
					try {
						currentValue = JSON.stringify(currentValue);
					} catch (_er) {}

					game.editor.ui.modal.showPrompt('Enter value to await (' + currentValue + ')', game.editor.settings.getItem('debug-data-property-value')).then((value:string) => {
						if (value) {
							game.editor.settings.setItem('debug-data-property-value', value);
						}
						DataAccessDebugger.breakOnDataPropertySet(propertyName, value);
					});
				} else {
					DataAccessDebugger.breakOnDataPropertySet(propertyName);
				}
			});
		}
	}
], 'debug-data-access');
