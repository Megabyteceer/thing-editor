class Signal {
	constructor() {
		this._listeners = [];
		this._listenersOnce = [];
	}
	
	add(f) {
		this._listeners.push(f);
	}
	
	addOnce(f) {
		throw "forgot about this antipattern.";
	}
	
	emit() {
		this._listeners.some((l) => {
			l.call(null, arguments);
		});
		this._listenersOnce.some((l) => {
			l.call(null, arguments);
		});
		this._listenersOnce.length = 0;
	}
}

window.Signal = Signal;