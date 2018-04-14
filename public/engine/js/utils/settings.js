class Settings {
	constructor(storageId) {
        this._storageId = storageId;
        if (typeof(Storage) !== "undefined") {
            if (localStorage.hasOwnProperty(name)) {
                this._store = JSON.parse(localStorage[storageId]);
            }
        }
        if(!this.hasOwnProperty('_store')) {
        	this.storage = {};
        }
        this.flush = this.flush.bind(this);
    }

	getItem(name, def){
		if(this._store.hasOwnProperty(name)){
			return this._store[name];
		}
		return def;
	}

	setItem(name, val) {
        this._store[name] = val;
		changed();
	}

	removeItem(name) {
		delete(this._store[name]);
        changed();
	}

	changed() {
		if(!this.hasOwnProperty('__flushInterval')) {
			this.__flushInterval = setInterval(this.flush, 10, this);
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