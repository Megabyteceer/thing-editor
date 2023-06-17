import { Point, Renderer } from "pixi.js";
import editable from "thing-editor/src/editor/props-editor/editable";
import game from "thing-editor/src/engine/game";
import Shape from "thing-editor/src/engine/lib/shape.c";

const zeroPoint = new Point();

export default class __BackDrop extends Shape {

	@editable()
	isStageFrame = false;

	render(renderer: Renderer): void {

		if(this.isStageFrame) {
			this.parent.toLocal(zeroPoint, game.stage, this, false);
			this.width = game.W * game.stage.scale.x;
			this.height = game.H * game.stage.scale.y;
		} else {
			this.parent.toLocal(zeroPoint, game.stage.parent, this, false);

			this.width = game.W / game.stage.scale.x;
			this.height = game.H / game.stage.scale.y;

		}
		this.updateTransform();
		super.render(renderer);
	}
}