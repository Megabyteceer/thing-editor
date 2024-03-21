import type { Container } from 'pixi.js';
import { DisplayObject } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import type Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

const ACCESS_ASSERTING_Func = () => {
	assert(false, 'Scene`s "all" object vas not initialized yet. You can not use "all" before call super.init().', 10017);
};
const ACCESS__ALL_ASSERTING_PROXY = new Proxy({}, {
	get: ACCESS_ASSERTING_Func,
	set: ACCESS_ASSERTING_Func as any
});


const reasonsCache: Map<number, string> = new Map();

const getRefuseReason = (count: number): string => {
	if (!reasonsCache.has(count)) {
		reasonsCache.set(count, 'Refused because ' + count + ' objects with that name present on the scene.');
	}
	return reasonsCache.get(count)!;
};


let validatorCounter = 0;
let refsCounter: KeyedMap<number> = {};

function addAllRefsValidator(scene: Scene) {
	refsCounter = {};

	let deletionValidator = validatorCounter++;

	scene.all = new Proxy(scene.all, {
		get: (all: KeyedObject, containerName: string) => {
			if (containerName === '___EDITOR_isGoodForChooser') {
				return true;
			} else if (containerName === '___EDITOR_ChooserOrder') {
				return 100000;
			}
			let ret = (all)[containerName];
			if (!game.__EDITOR_mode && containerName !== 'hasOwnProperty') {
				let refsWithThanNameCount = refsCounter[containerName];
				assert(ret, 'Attempt to access to scene object \'all.' + containerName + '\'. Reference is empty: ' + ret, 10018);
				assert((ret instanceof DisplayObject) && (!refsWithThanNameCount || refsWithThanNameCount === 1), 'Attempt to access to object \'all.' + containerName + '\'. But ' + refsWithThanNameCount + ' object with that name present on scene ' + scene.name + '(' + scene.constructor.name + ').', 10019);
				assert(ret.__nodeExtendData.__allRefsDeletionValidator === deletionValidator, 'Attempt to access to scene object \'all.' + containerName + '\'. Reference to object is presents, but this object was removed from scene already. Use \'all\' path only for objects which never deleted from scene.', 10020);
			}
			return ret;
		},
		set: (all: KeyedObject, containerName: string, val: Container) => {
			val.__nodeExtendData.__allRefsDeletionValidator = deletionValidator;
			let count = refsCounter[containerName] || 0;
			if (!count) {
				all[containerName] = val;
			}
			count++;
			refsCounter[containerName] = count;
			return true;
		}
	}) as ThingSceneAllMap;
}

const getAllObjectRefsCount = (name: string): string | undefined => {
	let count = refsCounter[name];
	if (count > 1) {
		return getRefuseReason(count);
	}
};


export { ACCESS__ALL_ASSERTING_PROXY, addAllRefsValidator, getAllObjectRefsCount };

