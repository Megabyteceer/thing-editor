import type { SelectEditorItem } from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import Lib from 'thing-editor/src/engine/lib';

export default function makePrefabSelector(startsWith?: string, canBeEmpty = true, filter?: ((item: SelectEditorItem) => boolean)) {
	let ret = () => {
		let prefabsList: SelectEditorItem[] = [];
		if (canBeEmpty) {
			prefabsList.push({ name: ' ', value: null });
		}
		let a = Lib.prefabs;
		for (let name in a) {
			if (!startsWith || name.startsWith(startsWith)) {
				prefabsList.push({ name, value: name });
			}
		}
		if (filter) {
			prefabsList = prefabsList.filter(filter);
		}
		return prefabsList;
	};

	return ret;
}
