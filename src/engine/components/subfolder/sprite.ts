import * as PIXI from "pixi.js";
import '../../../utils/assert';

import editable from "../../../editor/props-editor/editable";

export default class Sprite extends PIXI.Sprite {

	@editable({ default: 0, min: 0, max: 100, step: 1 })
	a = 0;

	@editable({ default: 0, min: 0, max: 200, step: 1 })
	b = 0;

	init() {
	}
}