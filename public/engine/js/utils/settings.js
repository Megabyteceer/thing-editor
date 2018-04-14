class Settings {
	constructor(storageId) {
        this._storageId = storageId;
        if (typeof(Storage) !== "undefined") {
            if (localStorage.hasOwnProperty(storageId)) {
                this._store = JSON.parse(localStorage[storageId]);
            }
        }
        if(!this.hasOwnProperty('_store')) {
        	this._store = {};
        }
        this.flush = this.flush.bind(this);
    }

	getItem(name, def) {
		if(this._store.hasOwnProperty(name)){
			return this._store[name];
		}
		return def;
	}

	setItem(name, val) {
        this._store[name] = val;
		this.changed();
	}

	removeItem(name) {
		delete(this._store[name]);
        this.changed();
	}

	changed() {
		if(!this.hasOwnProperty('__flushInterval')) {
			this.__flushInterval = setTimeout(this.flush, 10, this);
		}
	}

	flush() {
        if (typeof(Storage) !== "undefined") {
        	delete(this.__flushInterval);
            localStorage.setItem(this._storageId, JSON.stringify(this._store));
        }
	}
}

export default Settings;