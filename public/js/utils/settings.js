class Settings {
	constructor(storageId) {
		this.storageId = storageId;
	}
	
	getItem(name, def){
		if (typeof(Storage) !== "undefined") {
			if (localStorage.hasOwnProperty(name)) {
				return JSON.parse(localStorage[name]);
			}
		}
		return def;
	}

	setItem(name, val) {
		if (typeof(Storage) !== "undefined") {
			localStorage.setItem(name, JSON.stringify(val));
		}
	}

	removeItem(name) {
		if (typeof(Storage) !== "undefined") {
			localStorage.removeItem(name);
		}
	}
}

export default Settings;