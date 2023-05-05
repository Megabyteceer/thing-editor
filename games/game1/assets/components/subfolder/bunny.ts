
import editable from "thing-editor/src/editor/props-editor/editable";
import { PIXI } from "thing-editor/src/engine/game";

export default class Bunny extends PIXI.Sprite {

	@editable({ type: 'number', min: 0, max: 100, step: 1 })
	a: any;

	@editable({ min: 0, max: 200, step: 1 })
	b = 0;

	constructor() {
		super();
	}

	init() {

	}
}
