// thing-editor auto generated file.
import Container from "thing-editor/src/engine/lib/container.c";
import ProgressBar from "thing-editor/src/engine/lib/extended/progress-bar.c";
import __BackDrop from "thing-editor/src/engine/lib/___system/backdrop.c";
import ___Guide from "thing-editor/src/engine/lib/___system/guide.c";
import MovieClip from "thing-editor/src/engine/lib/movie-clip/movie-clip.c";
import Shape from "thing-editor/src/engine/lib/shape.c";
export default class TLib {
	static loadPrefab(prefabName: 'fader/default'):Container;
	static loadPrefab(prefabName: '___default_content/progressbar'):ProgressBar;
	static loadPrefab(prefabName: '___system/backdrop'):__BackDrop;
	static loadPrefab(prefabName: '___system/gizmo'):Container;
	static loadPrefab(prefabName: '___system/guide'):___Guide;
	static loadPrefab(prefabName: '___system/unknown-prefab'):Container;
	static loadPrefab(prefabName: 'prefab1'):MovieClip;
	static loadPrefab(prefabName: 'prefab2'):Shape;
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}