import { Container } from "pixi.js";
import { moveSelectionToPoint } from "thing-editor/src/editor/ui/editor-overlay";
import game from "thing-editor/src/engine/game";

export default class ___Gizmo extends Container {

	rotationGuide!: Container;

	init() {
		super.init();
		this.rotationGuide = this.findChildByName('rotation-guide') as Container;

	}

	moveXY(dX: number, dY: number, withoutChildren = false) {
		moveSelectionToPoint(dX, dY, withoutChildren);
	}

	update(): void {
		super.update();
		let selected = game.editor.selection[0];
		if(selected) {
			this.visible = true;
			this.parent.toLocal(selected, selected.parent, this);
			this.rotation = selected.parent.getGlobalRotation();
			this.rotationGuide.rotation = selected.rotation;
			this.scale.x = this.scale.y = game.pixiApp.view.width / (game.pixiApp.view as HTMLCanvasElement).clientWidth;
		} else {
			this.visible = false;
		}
	}
}