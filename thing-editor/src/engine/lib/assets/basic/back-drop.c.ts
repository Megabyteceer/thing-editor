import { Point, Renderer } from "pixi.js";
import game from "thing-editor/src/engine/game";
import Shape from "thing-editor/src/engine/lib/assets/shape.c";

const zeroPoint = new Point();

export default class BackDrop extends Shape {

	render(renderer: Renderer): void {
		this.parent.toLocal(zeroPoint, game.stage, this, false);
		this.width = game.W;
		this.height = game.H;
		this.updateTransform();
		super.render(renderer);
	}
}