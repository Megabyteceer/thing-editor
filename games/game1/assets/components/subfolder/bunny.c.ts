
import editable from "thing-editor/src/editor/props-editor/editable";
import game from "thing-editor/src/engine/game";
import DSprite from "thing-editor/src/engine/lib/assets/d-sprite.c";
import { stepTo } from "thing-editor/src/engine/utils/utils";

const FLOOR_Y = game.H - 25;

export default class Bunny extends DSprite {

	@editable()
	gravity = 2;

	init() {
		super.init();
		this.xSpeed = (Math.random() - 0.5) * 40;
		this.ySpeed = (Math.random() - 0.5) * 40;
	}

	update() {
		if(this.y >= FLOOR_Y) {
			this.y = FLOOR_Y;
			this.ySpeed *= -0.8;
			this.ySpeed = stepTo(this.ySpeed, 0, 1);
			this.xSpeed *= 0.8;
		} else {
			this.ySpeed += Math.min(this.gravity, FLOOR_Y - this.y);
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
