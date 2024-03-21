import type { Point } from 'pixi.js';
import { Container } from 'pixi.js';
import { moveSelectionToGlobalPoint } from 'thing-editor/src/editor/ui/editor-overlay';
import game from 'thing-editor/src/engine/game';
import ___GizmoArrow from 'thing-editor/src/engine/lib/assets/src/___system/gizmo-arrow.c';

let lastSelected: Container | null;

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
		if (!game.mouse.click) {
			this.interactiveChildren = true;
		}
		let selected = game.editor.selection[0];
		if (selected !== lastSelected) {
			this.interactiveChildren = false;
			const a = this.findChildrenByType(___GizmoArrow);
			for (const g of a) {
				g.onSelectionChange();
			}
		}
		if (selected) {
			this.visible = true;
			try {
				this.parent.toLocal(selected, selected.parent, this);

				this.rotation = selected.parent.getGlobalRotation();
				for (const guide of this.rotationGuides) {
					guide.rotation = selected.rotation;
				}
				this.scale.x = this.scale.y = game.editor.ui.viewport.viewportScale;
			} catch (_er) {
				this.visible = false;
			}
		} else {
			this.visible = false;
		}
		lastSelected = selected;
	}
}
