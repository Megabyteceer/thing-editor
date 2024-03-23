import fs from 'thing-editor/src/editor/fs';
import game from 'thing-editor/src/engine/game';

class Settings {
	_storageId: string;
	data: KeyedObject;
	__flushInterval = 0;

	static globalOnChanged?: (name: string, val: any) => void;

	constructor(storageId: string) {
		this._storageId = storageId;
		this.data = {};
		try {
			if (typeof (Storage) !== 'undefined') {
				if (localStorage.hasOwnProperty(storageId)) {
					this.data = JSON.parse(localStorage[storageId]);
				}
			}
		} catch (_er) { /* empty */ }
		this.flush = this.flush.bind(this);
		window.addEventListener('beforeunload', () => {
			if (this.__flushInterval) {
				this.flush();
			}
		});
	}

	getItem(name: string, def?: any): any {
		if (this.data.hasOwnProperty(name)) {
			return this.data[name];
		}
		return def;
	}

	setItem(name: string, val: any) {
		if ((val !== this.data[name]) || (typeof (val) === 'object')) {
			this.data[name] = val;
			this.changed();
			if (Settings.globalOnChanged) {
				Settings.globalOnChanged(name, val);
			}
		}
	}

	removeItem(name: string) {
		if (this.data.hasOwnProperty(name)) {
			delete (this.data[name]);
			this.changed();
		}
	}

	changed() {
		if (!this.__flushInterval) {
			/// #if EDITOR
			if (game.__EDITOR_mode) {
				this.flush();
				return;
			}
			/// #endif
			this.__flushInterval = window.setTimeout(this.flush, 10, this);
		}
	}

	clear() {
		this.data = {};
		this.changed();
	}

	flush() {
		if (typeof (Storage) !== 'undefined') {
			this.__flushInterval = 0;

			/// #if EDITOR
			game.editor.LocalStoreView.refresh();

			/// #endif

			try {
				localStorage.setItem(this._storageId, JSON.stringify(this.data,
					/// #if EDITOR
					fs.fieldsFilter
					/// #endif
				));
			} catch (_er) {
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
