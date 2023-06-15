import editable from "thing-editor/src/editor/props-editor/editable";
import DSprite from "thing-editor/src/engine/lib/d-sprite.c";

export default class LibComponent extends DSprite {


	@editable()
	set big(v: boolean) {
		this._big = v;
		this.scale.x = this.scale.y = v ? 3 : 1;
	}
	get big() {
		return this._big;
	}
	_big = false;

}