
import Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';

export default class UnPausableContainer extends Container {

	started = 0;

	init() {
		this.started = window.setInterval(() => {
			if (this.worldVisible && this.worldAlpha) {
				super.update();
			}
		}, 1000 / 60);
		super.init();
	}

	update(): void {

	}

	onRemove() {
		clearInterval(this.started);
		super.onRemove();
	}
}
