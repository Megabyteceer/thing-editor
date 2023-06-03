import { Container } from "pixi.js";
import game from "thing-editor/src/engine/game";

export default class __Gizmo extends Container {

	anglePointer!: Container;

	init() {
		super.init();
		this.anglePointer = this.findChildByName('angle-pointer') as Container;

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
			this.anglePointer.rotation = selected.rotation;
		} else {
			this.visible = false;
		}
	}
}