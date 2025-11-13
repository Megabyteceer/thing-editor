
import game from 'thing-editor/src/engine/game';
import Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';

export default class UnPausableContainer extends Container {

	started = 0;

	init() {
		this.started = window.setInterval(() => {
			if (game.__paused) {
				if (this.worldVisible && this.worldAlpha) {
					super.update();
				}
			}
		}, 1000 / 60);
		super.init();
	}

	update(): void {
		super.update();
	}

	onRemove() {
		clearInterval(this.started);
		super.onRemove();
	}
}
