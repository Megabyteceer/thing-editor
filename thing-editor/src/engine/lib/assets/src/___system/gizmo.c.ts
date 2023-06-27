import { Container } from "pixi.js";
import { moveSelectionToPoint } from "thing-editor/src/editor/ui/editor-overlay";
import game from "thing-editor/src/engine/game";

export default class __Gizmo extends Container {

	rotationGuide!: Container;

	init() {
		super.init();
		this.rotationGuide = this.findChildByName('rotation-guide') as Container;

	}

	moveXY(dX: number, dY: number) {
		moveSelectionToPoint(dX, dY);
	}

	update(): void {
		super.update();
		let selected = game.editor.selection[0];
		if(selected) {
			this.visible = true;
			this.parent.toLocal(selected, selected.parent, this);
			this.rotation = selected.parent.getGlobalRotation();
			this.rotationGuide.rotation = selected.rotation;
		} else {
			this.visible = false;
		}
	}
}