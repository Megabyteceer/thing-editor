import * as PIXI from "pixi.js";

import editable from "thing-editor/src/editor/props-editor/editable";

export default class Container extends PIXI.Sprite {

	@editable({ min: 0 })
	a = 0;

	init() {

	}
}