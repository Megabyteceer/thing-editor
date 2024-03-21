import type { Renderer } from 'pixi.js';
import { Point } from 'pixi.js';
import game from 'thing-editor/src/engine/game';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

const zeroPoint = new Point();
const sizePoint = new Point();

export default class BackDrop extends Shape {

	/// #if EDITOR
	__afterSerialization(data: SerializedObject): void {
		delete data.p.width;
		delete data.p.height;
		delete data.p.x;
		delete data.p.y;
	}

	/// #endif

	render(renderer: Renderer): void {
		this.parent.toLocal(zeroPoint, game.stage, sizePoint, false);
		if (!isNaN(sizePoint.x) && !isNaN(sizePoint.y)) {
			this.x = sizePoint.x;
			this.y = sizePoint.y;
			sizePoint.x = game.W;
			sizePoint.y = game.H;
			this.toLocal(sizePoint, game.stage, sizePoint, false);
			this.updateTransform();
			this.width = sizePoint.x;
			this.height = sizePoint.y;
			super.render(renderer);
		}
	}
}
