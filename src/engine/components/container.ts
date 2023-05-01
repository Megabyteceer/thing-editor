import * as PIXI from "pixi.js";
import '../../utils/assert';
import editable from "../../editor/props-editor/editable";

export default class Container extends PIXI.Sprite {

	@editable({ default: 0 })
	a = 0;

	init() {

	}
}