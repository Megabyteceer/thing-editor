
import { Constructor, KeyedObject } from "thing-editor/src/editor/env";
import assert from "thing-editor/src/engine/debug/assert";
import { PIXI } from "thing-editor/src/engine/game";

let _definedProps = new WeakMap();
let _valStore = new WeakMap();

let _getValStore = (o: KeyedObject) => {
	if(!_valStore.has(o)) {
		_valStore.set(o, {});
	}
	return _valStore.get(o);
};


export default function wrapPropertyWithNumberChecker(constructor: Constructor, propertyName: string) {

	if(!_definedProps.has(constructor)) {
		_definedProps.set(constructor, {});
	}
	let o = _definedProps.get(constructor);
	if(o.hasOwnProperty(propertyName)) return; //wrapped already
	o[propertyName] = true;

	let originalSetter: ((val: any) => void) | undefined;

	let newSetter = function wrapPropertyWithNumberCheckerSetter(this: KeyedObject, val: any) {
		assert(typeof val === 'number' && !isNaN(val), 'invalid value for "' + propertyName + '". Valid number value expected. ' + val + ' received.', 10001);
		//@ts-ignore
		originalSetter.call(this, val);
	};

	let d;

	let prot = constructor.prototype;
	while(prot) {
		d = Object.getOwnPropertyDescriptor(prot, propertyName);
		if(d) {
			//console.log("Property " + propertyName + " wrapped.")
			originalSetter = d.set;
			//@ts-ignore
			if(originalSetter.name === 'wrapPropertyWithNumberCheckerSetter') {
				return;
			}
			d.set = newSetter;
			break;
		}
		prot = Object.getPrototypeOf(prot);
	}

	if(!d) {
		//console.log("Own property " + propertyName + " wrapped.")
		let privValue = '__wrapper_store_' + propertyName;

		originalSetter = function (this: KeyedObject, val: any) {
			_getValStore(this)[privValue] = val;
		};
		d = {
			set: newSetter, get: function () {
				return _getValStore(this)[privValue];
			}
		};
	}

	try {
		Object.defineProperty(constructor.prototype, propertyName, d);
	} catch(er) {
		assert(false, "Can not add NaN checking for property '" + propertyName + "'. Please make this property configurable or add noNullCheck flag in it`s descriptor.", 40903);
	}
};

wrapPropertyWithNumberChecker(PIXI.ObservablePoint as any, 'x');
wrapPropertyWithNumberChecker(PIXI.ObservablePoint as any, 'y');
