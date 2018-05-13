export default class Signal {
	constructor() {
		this._listeners = [];
		this._listenersOnce = [];
	}
	
	add(f) {
		assert(this._listeners.indexOf(f) === -1, 'Handler already added');
		this._listeners.push(f);
	}
	
	remove(f) {
		var i = this._listeners.indexOf(f);
		assert(i >= 0, 'Handler is not exists');
		this._listeners.splice(i, 1);
	}
	
	addOnce(f) {
		throw "forgot about this antipattern.";
	}
	
	emit() {
		this._listeners.some((l) => {
			l.apply(null, arguments);
		});
		this._listenersOnce.some((l) => {
			l.apply(null, arguments);
		});
		this._listenersOnce.length = 0;
	}
}