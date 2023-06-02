import { Container } from "pixi.js";
import Shape from "thing-editor/src/engine/components/shape.c";
import game from "thing-editor/src/engine/game";

export default class __Gizmo extends Container {

	xAxis!: Shape;
	yAxis!: Shape;
	xyAxis!: Shape;

	init() {
		super.init();
	}

	moveXY(dX: number, dY: number) {
		for(let o of game.editor.selection) {
			game.editor.shiftObject(o, dX, dY);
		}
	}

	update(): void {
		super.update();
		let selected = game.editor.selection[0];
		if(selected) {
			this.visible = true;
			this.parent.toLocal(selected, selected.parent, this);
			this.rotation = selected.parent.getGlobalRotation();
		} else {
			this.visible = false;
		}
	}
}