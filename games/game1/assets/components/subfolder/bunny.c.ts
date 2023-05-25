
import { Sprite } from "pixi.js";
import editable from "thing-editor/src/editor/props-editor/editable";

export default class Bunny extends Sprite {

	@editable({ type: 'number', min: 0, max: 100, step: 1 })
	a = 0;

	@editable()
	b = '';

	constructor() {
		super();
	}

	init() {

	}
}
