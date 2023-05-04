import Lib from "thing-editor/src/engine/lib";

export default function makePrefabSelector(startsWith?: string, canBeEmpty = true, filter?: ((item: SelectComponentItem) => boolean)) {
	let ret = () => {
		let prefabsList: SelectComponentItem[] = [];
		if(canBeEmpty) {
			prefabsList.push({ name: ' ', value: '' });
		}
		let a = Lib.prefabs;
		for(let name in a) {
			if(!startsWith || name.startsWith(startsWith)) {
				prefabsList.push();
			}
		}
		if(filter) {
			prefabsList = prefabsList.filter(filter);
		}
		return prefabsList;
	};

	return ret;
};