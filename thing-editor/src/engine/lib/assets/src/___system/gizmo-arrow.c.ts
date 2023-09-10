import { Container } from "pixi.js";
import editable from "thing-editor/src/editor/props-editor/editable";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import game from "thing-editor/src/engine/game";
import ___Gizmo from "thing-editor/src/engine/lib/assets/src/___system/gizmo.c";
import Shape from "thing-editor/src/engine/lib/assets/src/extended/shape.c";

let lastX = 0;
let lastY = 0;

let startY = 0;

let startXPos = 0;
let startYPos = 0;
let startRotation = 0;


const mouseHandlerGlobalUp = () => {
	if(___GizmoArrow.draggedArrow) {
		___GizmoArrow.draggedArrow.stopDragging();
	}
}

const mouseHandlerGlobalMove = (ev: PointerEvent) => {
	if(___GizmoArrow.draggedArrow && (!game.mouse.click || !game.editor.selection.length)) {
		___GizmoArrow.draggedArrow.stopDragging();
	}
	if(___GizmoArrow.draggedArrow) {

		let dX = 0;
		let dY = 0;


		const gizmo = ___GizmoArrow.draggedArrow.findParentByType(___Gizmo);

		if(___GizmoArrow.draggedArrow.dragX && ___GizmoArrow.draggedArrow.dragY && ev.shiftKey) {

			dX = game.__mouse_uncropped.x - startXPos;
			dY = game.__mouse_uncropped.y - startYPos;

			const len = Math.sqrt(dX * dX + dY * dY);
			let angle = Math.atan2(dY, dX);
			angle = Math.round(angle / Math.PI * 4 - startRotation) * Math.PI / 4;
			dX = startXPos + Math.cos(angle) * len - game.editor.selection[0].x;
			dY = startYPos + Math.sin(angle) * len - game.editor.selection[0].y;
			___GizmoArrow.draggedArrow.snapGuide!.visible = true;
			___GizmoArrow.draggedArrow.snapGuide!.rotation = angle;
		} else {
			if(___GizmoArrow.draggedArrow.dragX) {
				dX = game.__mouse_uncropped.x - lastX;
			}
			if(___GizmoArrow.draggedArrow.dragY) {
				dY = game.__mouse_uncropped.y - lastY;
			}
		}

		gizmo?.moveXY(dX, dY, ev.ctrlKey);

		if(___GizmoArrow.draggedArrow.dragR) {
			if(ev.shiftKey) {
				dY = (game.__mouse_uncropped.y - startY) / -50;
				dY = Math.round(dY / Math.PI * 8 - startRotation) * Math.PI / 8;
				game.editor.editProperty('rotation', dY);
			} else {
				dY = (game.__mouse_uncropped.y - lastY) / -50;
				game.editor.editProperty('rotation', dY, true);
			}
		}

		lastX = game.__mouse_uncropped.x;
		lastY = game.__mouse_uncropped.y;
	}
};

window.addEventListener('pointermove', mouseHandlerGlobalMove);
window.addEventListener('pointerup', mouseHandlerGlobalUp);

export default class ___GizmoArrow extends Shape {

	static overedArrow?: ___GizmoArrow;
	static draggedArrow?: ___GizmoArrow;

	@editable()
	dragX = false

	@editable()
	dragY = false

	@editable()
	dragR = false

	@editable()
	cursor = 'move'

	isDowned = false;

	baseColor = 0;
	baseLineColor = 0;

	snapGuide?: Container;


	init() {
		super.init();
		this.on('pointerover', this.onPointerOver);
		this.on('pointerleave', this.onPointerOut);
		this.on('pointerdown', this.onPointerDown);
		this.baseColor = this.shapeFillColor;
		this.baseLineColor = this.shapeLineColor;
		this.snapGuide = this.findChildByName('snap-xy-guide');
		if(this.snapGuide) {
			this.snapGuide.visible = false;
		}
	}

	onPointerOver() {
		if(!___GizmoArrow.draggedArrow) {
			___GizmoArrow.overedArrow = this;
			this.shapeFillColor = 0xffff00;
			this.shapeLineColor = 0xffff00;
		}
	}

	update(): void {
		super.update();
		if(___GizmoArrow.overedArrow === this && this.worldAlpha < 0.8) {
			this.onPointerOut();
		}
	}

	onPointerOut() {
		___GizmoArrow.overedArrow = undefined;
		this._refreshColor();
	}

	onPointerDown(ev: PointerEvent) {
		if(ev.buttons === 1) {
			lastX = game.__mouse_uncropped.x;
			lastY = game.__mouse_uncropped.y;

			startY = game.__mouse_uncropped.y;

			startXPos = game.editor.selection[0].x;
			startYPos = game.editor.selection[0].y;
			startRotation = game.editor.selection[0].rotation;

			if(ev.altKey) {
				editorUtils.clone();
			}

			___GizmoArrow.draggedArrow = this;
			this.isDowned = true;
		} else if(ev.buttons === 2 && this.dragR) {
			game.editor.editProperty('rotation', 0);
		}
	}

	stopDragging() {
		___GizmoArrow.draggedArrow = undefined;
		if(this.snapGuide) {
			this.snapGuide.visible = false;
		}
		this.isDowned = false;
		this._refreshColor();
	}

	_refreshColor() {
		if(___GizmoArrow.overedArrow !== this && ___GizmoArrow.draggedArrow !== this) {
			this.shapeFillColor = this.baseColor;
			this.shapeLineColor = this.baseLineColor;
		}
	}
}