class Signal {
    constructor() {
        this._listeners = [];
    }

    add(f) {
        this._listeners.push(f);
    }
    
    emit() {
        this._listeners.some((l) => {
            l.call(null, arguments);
        });
    }
}
window.Signal = Signal;