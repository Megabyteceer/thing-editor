import { Point, Renderer } from "pixi.js";
import Shape from "thing-editor/src/engine/components/shape.c";
import game from "thing-editor/src/engine/game";

const zeroPoint = new Point();

export default class __BackDrop extends Shape {

	render(renderer: Renderer): void {

		this.parent.toLocal(zeroPoint, game.stage.parent, this, false);

		this.width = game.W / game.stage.scale.x;
		this.height = game.H / game.stage.scale.y;
		this.updateTransform();

		super.render(renderer);
	}
}