import { Container, DisplayObject } from "pixi.js";
import { KeyedMap, KeyedObject } from "thing-editor/src/editor/env";
import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

const ACCES_ASSERTING_Func = () => {
	assert(false, 'Scene`s "all" object vas not initialized yet. You can not use "all" before call super.init().', 10017);
};
const ACCES__ALL_ASSERTING_PROXY = new Proxy({}, {
	get: ACCES_ASSERTING_Func,
	set: ACCES_ASSERTING_Func as any
});


let validatorCounter = 0;

function addAllRefsValidator(scene: Scene) {
	let refsCounter: KeyedMap<number> = {};
	Scene.__refsCounter = refsCounter;
	let deletionValidator = validatorCounter++;

	scene.all = new Proxy(scene.all, {
		get: (target: any, prop: string) => {
			if(prop === '___EDITOR_isGoodForChooser') {
				return true;
			} else if(prop === '___EDITOR_ChooserOrder') {
				return 100000;
			}
			let ret = (target as KeyedObject)[prop];
			if(!game.__EDITOR_mode && prop !== 'hasOwnProperty') {
				let refsWithThanNameCount = refsCounter[prop];
				assert(ret, "Attempt to access to scene object 'all." + prop + "'. Reference is empty: " + ret, 10018);
				assert((ret instanceof DisplayObject) && (!refsWithThanNameCount || refsWithThanNameCount === 1), "Attempt to access to object 'all." + prop + "'. But " + refsWithThanNameCount + " object with that name present on scene " + scene.name + "(" + scene.constructor.name + ").", 10019);
				assert(ret.__nodeExtendData.__allRefsDeletionValidator === deletionValidator, "Attempt to access to scene object 'all." + prop + "'. Reference to object is presents, but this object was removed from scene already. Use 'all' path only for objects which never deleted from scene.", 10020);
			}
			return ret;
		},
		set: (target, prop: string, val: Container) => {
			val.__nodeExtendData.__allRefsDeletionValidator = deletionValidator;
			let count = refsCounter[prop] || 0;
			if(!count) {
				target[prop] = val;
			}
			count++;
			refsCounter[prop] = count;
			return true;
		}
	});
}

export { addAllRefsValidator, ACCES__ALL_ASSERTING_PROXY };
