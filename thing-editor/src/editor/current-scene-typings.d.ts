// thing-editor auto generated file.

import { Container } from "pixi.js";
import MovieClip from "thing-editor/src/engine/lib/movie-clip/movie-clip.c";
import Sprite from "thing-editor/src/engine/lib/sprite.c";
import Shape from "thing-editor/src/engine/lib/shape.c";
import Text from "thing-editor/src/engine/lib/basic/text.c";
			
declare global {
type CurrentSceneType = Scene;

interface ThingSceneAllMap {
	[key: string]: Container;
"mc":MovieClip;
"bg":Sprite;
"bar":Sprite;
"cap":Sprite;
"prefab2":Shape;
/** @deprecated Refused because 2 objects with that name present on the scene. */
"prefab3":Shape;
"prefab4":Shape;
"txt":Text;
}
}
