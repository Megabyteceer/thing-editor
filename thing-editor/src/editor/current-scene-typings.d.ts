// thing-editor auto generated file.

import { Container } from "pixi.js";
import Slot from "games/slot-client/assets/src/custom/slot.c";
import Reel from "games/slot-client/assets/src/custom/reel.c";
import MovieClip from "thing-editor/src/engine/lib/assets/src/basic/movie-clip.c";
import SlotSymbol from "games/slot-client/assets/src/custom/slot-symbol.c";
import Fill from "thing-editor/src/engine/lib/assets/src/basic/fill.c";
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import MoneyLabel from "games/slot-client/assets/src/custom/money-label.c";
import BuyFeature from "games/slot-client/assets/src/slot/buy-feature.c";
import Label from "thing-editor/src/engine/lib/assets/src/extended/label.c";
import Trigger from "thing-editor/src/engine/lib/assets/src/extended/trigger.c";
			
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
"info-line":Container;
"balance-label":MoneyLabel;
"win-label":MoneyLabel;
"bet-label":MoneyLabel;
"buy-features":BuyFeature;
/** @deprecated Refused because 2 objects with that name present on the scene. */
"label":Label;
"disabled-overlay":Trigger;
"active-overlay":MovieClip;
}
}
