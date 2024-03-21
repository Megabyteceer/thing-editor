
import editable from 'thing-editor/src/editor/props-editor/editable';
import DSprite from 'thing-editor/src/engine/lib/assets/src/basic/d-sprite.c';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

export default class ParticleShort extends DSprite {

	size = 1;

	@editable({ min: 3 })
	duration = 10;

	chanceToRemove = 0;

	@editable({ min: 0.01, max: 1 })
	xSpeedFactor = 0.93;

	@editable({ min: 0.01, max: 1 })
	ySpeedFactor = 0.93;

	alphaSpeed = 0;

	init() {
		super.init();
		this.size = this.scale.x * (Math.random() + 0.2);
		this.scale.y = this.scale.x = 0.1;
		this.alphaSpeed = 1 / this.duration;
		this.chanceToRemove = 1 - 1 / this.duration;
	}

	update() {
		this.scale.y = this.scale.x = stepTo(this.scale.x, this.size, 0.2);
		this.xSpeed += (Math.random() - 0.5);
		this.xSpeed *= this.xSpeedFactor;
		this.ySpeed += (Math.random() - 0.65);
		this.ySpeed *= this.ySpeedFactor;

		if (this.alpha < 1) {
			this.alpha -= this.alphaSpeed;
			if (this.alpha <= 0) {
				this.remove();
			}
		} else if (Math.random() > this.chanceToRemove) {
			this.alpha -= this.alphaSpeed;
		}
		super.update();
	}
}
