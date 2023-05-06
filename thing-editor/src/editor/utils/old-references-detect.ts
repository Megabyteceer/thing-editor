import { Container } from "pixi.js";
import { KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import assert from "thing-editor/src/engine/debug/assert";

import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const objectsReferences: Map<KeyedObject, Map<SourceMappedConstructor, string>> = new Map;

function markOldReferences(o: KeyedObject) {
	objectsReferences.set(o, new Map());
	for(let f of Object.getOwnPropertyNames(o)) {
		if(((o as KeyedObject)[f] instanceof Container)) {
			if(f !== 'tempDisplayObjectParent') {
				o[f] = accessDetectionProxy(o.constructor as SourceMappedConstructor, f);
				o.___EDITOR_markedOldReferences.set(f, o[f]);
			}
		}
	}
}

function checkForOldReferences(o: KeyedObject) {
	if(o.___EDITOR_markedOldReferences && !Lib.__outdatedReferencesDetectionDisabled) {
		for(let f of o.___EDITOR_markedOldReferences.keys()) {
			if(o[f] === o.___EDITOR_markedOldReferences.get(f)) {
				let c = o.constructor;

				game.editor.logError(c.name + ' did not clean reference to display object in property "' + f + '". Please null this field in onRemove method, or add "@editable({type: "ref"})" decorator for this field (click to copy fix-js and open class source code.).', 10048, () => {
					game.editor.copyToClipboard('@editable({type: "ref"})');
					game.editor.editClassSource(c as SourceMappedConstructor);
				});

			}
		}
	}
}

function accessToOldReferenceDetector(obj: OutdatedProxy, prop: any): any {
	if(!Lib.__outdatedReferencesDetectionDisabled) {
		game.editor.editClassSource(obj.class_);
		assert(prop === 'thisIsOutdatedReference', "Access to outdated reference \"" + obj.fieldName + "\" in class \"" + obj.class_.name + "\" detected. Please clear reference in onRemove method.", 10041);
	}
}

interface OutdatedProxy {
	thisIsOutdatedReference: "thisIsOutdatedReference",
	class_: SourceMappedConstructor,
	fieldName: string
}

const accessDetectionProxiesCache = new Map();
const accessDetectionProxy = (class_: SourceMappedConstructor, fieldName: string) => {
	let key = class_.name + ':' + fieldName;
	if(!accessDetectionProxiesCache.has(key)) {
		let procObject: OutdatedProxy = {
			thisIsOutdatedReference: "thisIsOutdatedReference",
			class_,
			fieldName
		};

		let p = new Proxy(procObject, {
			get: accessToOldReferenceDetector,
			set: accessToOldReferenceDetector,
			has: accessToOldReferenceDetector,
			deleteProperty: accessToOldReferenceDetector,
			//@ts-ignore
			ownKeys: accessToOldReferenceDetector,
			apply: accessToOldReferenceDetector
		});
		accessDetectionProxiesCache.set(key, p);
		return p;
	}
	return accessDetectionProxiesCache.get(key);
};

export { markOldReferences, checkForOldReferences }