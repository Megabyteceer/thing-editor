// thing-editor auto generated file.
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Resizer from "thing-editor/src/engine/lib/assets/src/extended/resizer.c";
import Flow from "games/slot-client/assets/src/custom/flow.c";
export default class TLib {
	static loadPrefab(prefabName: 'fader/default'):Container;
	static loadPrefab(prefabName: 'ui/sure-question'):Resizer;
	static loadPrefab(prefabName: 'flow-animation1'):Flow;
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}