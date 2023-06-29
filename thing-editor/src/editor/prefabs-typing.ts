// thing-editor auto generated file.
import MovieClip from "thing-editor/src/engine/lib/assets/src/basic/movie-clip.c";
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Shape from "thing-editor/src/engine/lib/assets/src/extended/shape.c";
export default class TLib {
	static loadPrefab(prefabName: '7777'):MovieClip;
	static loadPrefab(prefabName: 'fader/default'):Container;
	static loadPrefab(prefabName: 'prefab1'):MovieClip;
	static loadPrefab(prefabName: 'prefab2'):Shape;
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}