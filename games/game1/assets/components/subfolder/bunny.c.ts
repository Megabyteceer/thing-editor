
import editable from "thing-editor/src/editor/props-editor/editable";
import DSprite from "thing-editor/src/engine/components/d-sprite.c";
import game from "thing-editor/src/engine/game";

export default class Bunny extends DSprite {

	@editable()
	gravity = 2;

	_a = 0;

	update() {
		if(this.y > game.H - 25) {
			this.ySpeed = -Math.abs(this.ySpeed);
		} else if(this.y < 0) {
			this.y = 0;
			this.ySpeed *= -1;
		} else {
			this.ySpeed += this.gravity;
		}

		if(this.x < 0) {
			this.x = 0;
			this.xSpeed *= -1.0;
		}

		if(this.x > game.W) {
			this.x = game.W;
			this.xSpeed *= -1.0;
		}

		this.scale.x = this.xSpeed > 0 ? 1 : -1;
		super.update();
	}

}
