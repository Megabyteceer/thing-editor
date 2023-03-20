import assert from "thing-editor/js/engine/utils/assert.js";

let pools = new Map();
/// #if EDITOR
let __idCounter = 1;
/// #endif

export default class Pool {

	static clearAll() {
		/// #if EDITOR
		Pool.__resetIdCounter();
		/// #endif
		pools.clear();
	}

	/// #if EDITOR
	static __resetIdCounter() {
		__idCounter = 1;
	}
	/// #endif

	static create(constructor) {
		if(!pools.has(constructor)) {
			const ret = new constructor();
			/// #if EDITOR
			ret.___id = __idCounter++;
			/// #endif
			return ret;
		}
		let a = pools.get(constructor);
		if(a.length === 0) {
			const ret = new constructor();
			/// #if EDITOR
			ret.___id = __idCounter++;
			/// #endif
			return ret;
		}
		/// #if EDITOR
		let i = Math.floor(Math.random() * a.length);
		let ret = a[i];
		a.splice(i, 1);
		assert(!ret.hasOwnProperty('children') || ret.children.length === 0, "Pool contains " + constructor.name + " with non empty children.", 90001);
		ret.___id = __idCounter++;
		return ret;
		/// #endif

		return a.pop(); // eslint-disable-line no-unreachable
	}

	static dispose(obj) {
		/// #if EDITOR
		obj.___id = null;
		/// #endif
		let key = obj.constructor;
		if(!pools.has(key)) {
			pools.set(key, []);
		}

		assert(pools.get(key).indexOf(obj) === -1, 'Object already disposed');

		pools.get(key).push(obj);
	}
}