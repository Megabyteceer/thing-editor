// thing-editor auto generated file.
import Container from "thing-editor/src/engine/lib/container.c";
import MovieClip from "thing-editor/src/engine/lib/movie-clip/movie-clip.c";
import Shape from "thing-editor/src/engine/lib/shape.c";
export default class TLib {
	static loadPrefab(prefabName: 'fader/default'):Container;
	static loadPrefab(prefabName: 'prefab1'):MovieClip;
	static loadPrefab(prefabName: 'prefab2'):Shape;
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}