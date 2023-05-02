import * as PIXI from "pixi.js";

import editable from "thing-editor/src/editor/props-editor/editable";
import game from "thing-editor/src/engine/game";

export default class Sprite extends PIXI.Sprite {

	@editable({ min: 0, max: 100, step: 1 })
	a = 0;

	@editable({ min: 0, max: 200, step: 1 })
	b = 0;

	init() {
		game.alert();
	}
}