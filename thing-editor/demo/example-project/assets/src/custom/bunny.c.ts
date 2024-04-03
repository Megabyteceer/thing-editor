

import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';

let FLOOR_Y = 0;

export default class Bunny extends DSprite {

	@editable()
	gravity = 2;

	init() {
		super.init();
		this.xSpeed = (Math.random() - 0.5) * 40;
		this.ySpeed = (Math.random() - 0.5) * 40;
		FLOOR_Y = game.H - 25;
	}
	_onRenderResize() {
		FLOOR_Y = game.H - 25;
	}

	update() {
		if (this.y >= FLOOR_Y) {
			this.ySpeed *= -1;
		} else {
			this.ySpeed += Math.min(this.gravity, FLOOR_Y - this.y);
		}

		if (this.x < 0) {
			this.x = 0;
			this.xSpeed *= -1.0;
		}

		if (this.x > game.W) {
			this.x = game.W;
			this.xSpeed *= -1.0;
		}

		this.scale.x = this.xSpeed > 0 ? 1 : -1;
		super.update();
	}
}
