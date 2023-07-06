// thing-editor auto generated file.

import { Container } from "pixi.js";
import Slot from "games/slot-client/assets/src/custom/slot.c";
import Reel from "games/slot-client/assets/src/custom/reel.c";
import MovieClip from "thing-editor/src/engine/lib/assets/src/basic/movie-clip.c";
import SlotSymbol from "games/slot-client/assets/src/custom/slot-symbol.c";
import Fill from "thing-editor/src/engine/lib/assets/src/basic/fill.c";
			
declare global {
type CurrentSceneType = Scene;

interface ThingSceneAllMap {
	[key: string]: Container;
"slot":Slot;
/** @deprecated Refused because 5 objects with that name present on the scene. */
"reel":Reel;
/** @deprecated Refused because 5 objects with that name present on the scene. */
"content-container":MovieClip;
/** @deprecated Refused because 15 objects with that name present on the scene. */
"slot/symbol":SlotSymbol;
/** @deprecated Refused because 15 objects with that name present on the scene. */
"container":MovieClip;
/** @deprecated Refused because 5 objects with that name present on the scene. */
"spin-blur-fill":Fill;
}
}
