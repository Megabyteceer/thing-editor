import { Container, Point } from "pixi.js";
import { moveSelectionToGlobalPoint } from "thing-editor/src/editor/ui/editor-overlay";
import game from "thing-editor/src/engine/game";

export default class ___Gizmo extends Container {

	rotationGuides!: Container[];

	init() {
		super.init();
		this.rotationGuides = this.findChildrenByName('rotation-guide') as Container[];

	}

	moveXY(p: Point, withoutChildren = false) {
		moveSelectionToGlobalPoint(p, withoutChildren);
	}

	update(): void {
		super.update();
		let selected = game.editor.selection[0];
		if(selected) {
			this.visible = true;
			this.parent.toLocal(selected, selected.parent, this);
			this.rotation = selected.parent.getGlobalRotation();
			for(const guide of this.rotationGuides) {
				guide.rotation = selected.rotation;
			}
			this.scale.x = this.scale.y = game.editor.ui.viewport.viewportScale;
		} else {
			this.visible = false;
		}
	}
}