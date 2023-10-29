
import { KeyedObject } from "thing-editor/src/editor/env";
import assert from "thing-editor/src/engine/debug/assert";
import defaultProjectDesc from "thing-editor/src/engine/utils/default-project-desc";

const mergeProjectDesc = (target: ProjectDesc, src: ProjectDesc) => {
	for(const key in src) {
		const targetVal = (target as KeyedObject)[key];
		const srcVal = (src as KeyedObject)[key];
		if(key === 'loadOnDemandTextures' || key === 'loadOnDemandSounds') {
			(target as KeyedObject)[key] = Object.assign({}, srcVal, targetVal);
		} else if(key === 'webfontloader') {
			let newVal;
			if(targetVal && typeof targetVal !== 'object') {
				assert(false, 'invalid "webfontloader" property: ' + JSON.stringify(targetVal));
			}
			if(srcVal && typeof srcVal !== 'object') {
				assert(false, 'invalid "webfontloader" property: ' + JSON.stringify(srcVal));
			}

			if(!srcVal) {
				newVal = targetVal;
			} else if(!targetVal) {
				newVal = srcVal;
			} else {
				newVal = Object.assign({}, targetVal);
				for(let provider in srcVal) {
					if(srcVal[provider] && srcVal[provider].families) {
						let families = srcVal[provider].families;
						if(targetVal[provider] && targetVal[provider].families) {
							families = targetVal[provider].families.concat(families);
						}
						newVal[provider] = { families };
					} else {
						newVal[provider] = srcVal[provider];
					}
				}
			}
			(target as KeyedObject)[key] = newVal;
		} else if(Array.isArray(targetVal)) {
			if(srcVal) {
				const newVal = targetVal.slice();
				for(const s of srcVal) {
					if(newVal.indexOf(s) < 0) {
						newVal.push(s);
					}
				}
				(target as KeyedObject)[key] = newVal;
			}
		} else {
			(target as KeyedObject)[key] = srcVal;
		}
	}
};


export default mergeProjectDesc;

defaultProjectDesc;