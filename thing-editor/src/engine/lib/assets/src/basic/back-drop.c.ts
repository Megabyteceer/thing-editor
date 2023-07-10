import { Point, Renderer } from "pixi.js";
import game from "thing-editor/src/engine/game";
import Shape from "thing-editor/src/engine/lib/assets/src/extended/shape.c";

const zeroPoint = new Point();
const sizePoint = new Point();

export default class BackDrop extends Shape {

	render(renderer: Renderer): void {
		this.parent.toLocal(zeroPoint, game.stage, this, false);
		sizePoint.x = game.W;
		sizePoint.y = game.H;
		this.toLocal(sizePoint, game.stage, sizePoint, false);
		this.updateTransform();
		this.width = sizePoint.x;
		this.height = sizePoint.y;
		super.render(renderer);
	}
}