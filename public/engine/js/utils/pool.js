var pools = new Map();

export default class Pool {
	
	static clearAll() {
		pools.clear();
	}
	
	static create(constructor) {
		if (!pools.has(constructor)) {
			return new constructor();
		}
		var a = pools.get(constructor);
		if (a.length === 0) {
			return new constructor();
		}
		return a.pop();
	}
	
	static dispose(obj) {
		var key = obj.constructor;
		if (!pools.has(key)) {
			pools.set(key, []);
		}
		//editor
		assert(pools.get(key).indexOf(obj) === -1, 'Object already disposed');
		//ENDEDITOR
		
		pools.get(key).push(obj);
	}
}