import type { KeyedObject, SelectableProperty } from "thing-editor/src/editor/env.js";
import fs from "thing-editor/src/editor/fs";
import game from "thing-editor/src/engine/game";

class Settings {
	_storageId: string;
	data: KeyedObject;
	__flushInterval?: number;

	static globalOnChanged?: (name: string, val: any) => void;

	constructor(storageId: string) {
		this._storageId = storageId;
		this.data = {};
		try {
			if(typeof (Storage) !== "undefined") {
				if(localStorage.hasOwnProperty(storageId)) {
					this.data = JSON.parse(localStorage[storageId]);
				}
			}
		} catch(er) { }
		this.flush = this.flush.bind(this);
	}

	getItem(name: string, def?: any): any {
		if(this.data.hasOwnProperty(name)) {
			return this.data[name];
		}
		return def;
	}

	setItem(name: string, val: any) {
		if((val !== this.data[name]) || (typeof (val) === 'object')) {
			this.data[name] = val;
			this.changed();
			if(Settings.globalOnChanged) {
				Settings.globalOnChanged(name, val);
			}
		}
	}

	removeItem(name: string) {
		if(this.data.hasOwnProperty(name)) {
			delete (this.data[name]);
			this.changed();
		}
	}

	changed() {
		if(!this.__flushInterval) {
			/// #if EDITOR
			if(game.__EDITOR_mode) {
				this.flush();
				return;
			}
			/// #endif
			this.__flushInterval = setTimeout(this.flush, 10, this);
		}
	}

	clear() {
		this.data = {};
		this.changed();
	}

	flush() {
		if(typeof (Storage) !== "undefined") {
			this.__flushInterval = undefined;
			try {
				localStorage.setItem(this._storageId, JSON.stringify(this.data,
					/// #if EDITOR
					fs.fieldsFilter
					/// #endif
				));
			} catch(er) {
				this.data = this.data || {};
			}
		}
	}
}

export default Settings;

/// #if EDITOR
(Settings.prototype.changed as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Settings.prototype.flush as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Settings.prototype.getItem as SelectableProperty).___EDITOR_isHiddenForChooser = true;
/// #endif