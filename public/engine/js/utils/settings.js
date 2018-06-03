//local data storage

class Settings {
	constructor(storageId) {
		this._storageId = storageId;
		if (typeof(Storage) !== "undefined") {
			if (localStorage.hasOwnProperty(storageId)) {
				this.data = JSON.parse(localStorage[storageId]);
			}
		}
		if (!this.hasOwnProperty('data')) {
			this.data = {};
		}
		this.flush = this.flush.bind(this);
	}
	
	getItem(name, def) {
		if (this.data.hasOwnProperty(name)) {
			return this.data[name];
		}
		return def;
	}
	
	setItem(name, val) {
		if (JSON.stringify(val) !== JSON.stringify(this.data[name])) {
			this.data[name] = val;
			this.changed();
		}
	}
	
	removeItem(name) {
		if (this.data.hasOwnProperty(name)) {
			delete(this.data[name]);
			this.changed();
		}
	}
	
	changed() {
		if (!this.hasOwnProperty('__flushInterval')) {
			this.__flushInterval = setTimeout(this.flush, 10, this);
		}
	}
	
	flush() {
		if (typeof(Storage) !== "undefined") {
			delete(this.__flushInterval);
			localStorage.setItem(this._storageId, JSON.stringify(this.data));
		}
	}
}

export default Settings;