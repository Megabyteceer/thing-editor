import editable from "thing-editor/src/editor/props-editor/editable";
import __Gizmo from "thing-editor/src/engine/components/__system/gizmo.c";
import Shape from "thing-editor/src/engine/components/shape.c";
import game from "thing-editor/src/engine/game";

let dragLasX = 0;
let dragLasY = 0;

let dragStartX = 0;
let dragStartY = 0;

const mouseHandlerGlobalUp = () => {
	if(__GizmoArrow.draggedArrow) {
		__GizmoArrow.draggedArrow.stopDragging();
	}
}

const mouseHandlerGlobalMove = () => {
	if(__GizmoArrow.draggedArrow && !game.mouse.click) {
		__GizmoArrow.draggedArrow.stopDragging();
	}
	if(__GizmoArrow.draggedArrow) {

		let dX = 0;
		let dY = 0; game.__mouse_uncropped.y - dragLasY;

		if(__GizmoArrow.draggedArrow.dragX) {
			dX = game.__mouse_uncropped.x - dragLasX;
		}
		if(__GizmoArrow.draggedArrow.dragY) {
			dY = game.__mouse_uncropped.y - dragLasY;
		}

		__GizmoArrow.draggedArrow.findParentByType(__Gizmo)?.moveXY(dX, dY);

		dragLasX = game.__mouse_uncropped.x;
		dragLasY = game.__mouse_uncropped.y;
	}
};

window.addEventListener('pointermove', mouseHandlerGlobalMove);
window.addEventListener('pointerup', mouseHandlerGlobalUp);

export default class __GizmoArrow extends Shape {

	static overedArrow?: __GizmoArrow;
	static draggedArrow?: __GizmoArrow;

	@editable()
	dragX = false

	@editable()
	dragY = false

	@editable()
	cursor = 'move'

	baseColor = 0;

	init() {
		super.init();
		this.on('pointerover', this.onPointerOver);
		this.on('pointerleave', this.onPointerOut);
		this.on('pointerdown', this.onPointerDown);
		this.baseColor = this.shapeFillColor;
	}

	onPointerOver() {
		__GizmoArrow.overedArrow = this;
		this.shapeFillColor = 0xffff00;
		this.shapeLineColor = 0xffff00;
	}

	onPointerOut() {
		__GizmoArrow.overedArrow = undefined;
		this._refreshColor();
	}

	onPointerDown() {
		__GizmoArrow.draggedArrow = this;
		dragLasX = game.__mouse_uncropped.x;
		dragLasY = game.__mouse_uncropped.y;
		dragStartX = game.__mouse_uncropped.x;
		dragStartY = game.__mouse_uncropped.y;
	}

	stopDragging() {
		__GizmoArrow.draggedArrow = undefined;
		this._refreshColor();
	}

	_refreshColor() {
		if(__GizmoArrow.overedArrow !== this && __GizmoArrow.draggedArrow !== this) {
			this.shapeFillColor = this.baseColor;
			this.shapeLineColor = this.baseColor;
		}
	}
}