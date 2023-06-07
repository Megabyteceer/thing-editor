import { KeyedObject, SerializedObjectProps } from "thing-editor/src/editor/env";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

const __prefabsDefaults: Map<string, KeyedObject> = new Map();

const getPrefabDefaults = (prefabName: string): KeyedObject => {
	if(!__prefabsDefaults.has(prefabName)) {
		const ret: KeyedObject = {};
		if(Lib.hasPrefab(prefabName)) {
			const dataChain: SerializedObjectProps[] = [];
			let prefabData = Lib.prefabs[prefabName] || ret;
			while(true) {
				dataChain.unshift(prefabData.p);
				if(prefabData.r) {
					prefabData = Lib.prefabs[prefabData.r];
				} else {
					break;
				}
			}
			if(game.classes[prefabData.c!]) {
				dataChain.unshift(game.classes[prefabData.c!].__defaultValues);
			}
			dataChain.unshift(ret);
			Object.assign.apply(ret, dataChain as any);
		}
		__prefabsDefaults.set(prefabName, ret);

	}
	return __prefabsDefaults.get(prefabName)!;
}

const invalidatePrefabDefaults = () => {
	__prefabsDefaults.clear();
}

export default getPrefabDefaults;

export { invalidatePrefabDefaults };
