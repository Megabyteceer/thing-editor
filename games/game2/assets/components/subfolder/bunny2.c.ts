
import editable from "thing-editor/src/editor/props-editor/editable";
import DSprite from "thing-editor/src/engine/components/d-sprite.c";
import game from "thing-editor/src/engine/game";
import { stepTo } from "thing-editor/src/engine/utils/utils";

const FLOOR_Y = game.H - 25;

export default class Bunny2 extends DSprite {

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
