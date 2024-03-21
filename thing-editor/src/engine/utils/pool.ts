import { Container } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';

let pools = new Map();
/// #if EDITOR
let __idCounter = 1;

const onNew = (ret: any) => {
	const editableProps = (ret.constructor as SourceMappedConstructor).__editableProps;
	if (editableProps) {
		for (let prop of editableProps) {
			if (prop.__nullCheckingIsApplied) {
				if (ret.hasOwnProperty(prop.name)) {
					delete ret[prop.name]; //delete own numeric properties to make NaN checking work
					ret[prop.name] = (ret.constructor as SourceMappedConstructor).__defaultValues[prop.name];
				}
			}
		}
	}
	onTake(ret);
};

const onTake = (ret: any) => {
	if (ret instanceof Container) {
		assert(!(ret as any)._eventsCount, 'Object has unsubscribed events');
		ret.___id = __idCounter++;
		ret.__nodeExtendData = {};
	}
};

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

	static create<T>(constructor: new () => T): T {
		if (!pools.has(constructor)) {
			const ret = new constructor();
			/// #if EDITOR
			onNew(ret);
			/// #endif
			return ret;
		}
		let a = pools.get(constructor);
		if (a.length === 0) {
			const ret = new constructor();
			/// #if EDITOR
			onNew(ret);
			/// #endif
			return ret;
		}
		/// #if EDITOR
		let i = Math.floor(Math.random() * a.length);
		let ret = a[i];
		a.splice(i, 1);
		assert(!(ret instanceof Container) || ret.children.length === 0, 'Pool contains ' + (constructor as any as SourceMappedConstructor).__className + ' with non empty children.', 90001);
		onTake(ret);
		return ret;
		/// #endif

		return a.pop(); // eslint-disable-line no-unreachable
	}

	static dispose(obj: any) {
		/// #if EDITOR
		obj.___id = null;
		/// #endif
		let key = obj.constructor;
		if (!pools.has(key)) {
			pools.set(key, []);
		}

		assert(pools.get(key).indexOf(obj) === -1, 'Object already disposed');

		pools.get(key).push(obj);
	}
}
