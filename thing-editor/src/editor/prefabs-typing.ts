// thing-editor auto generated file.
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Resizer from "thing-editor/src/engine/lib/assets/src/extended/resizer.c";
export default class TLib {
	static loadPrefab(prefabName: 'fader/default'):Container;
	static loadPrefab(prefabName: 'ui/sure-question'):Resizer;
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}