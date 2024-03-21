import type { Container } from 'pixi.js';
import { Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { stopRightButtonMoving } from 'thing-editor/src/editor/ui/editor-overlay';
import StatusBar from 'thing-editor/src/editor/ui/status-bar';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import game from 'thing-editor/src/engine/game';
import ___Gizmo from 'thing-editor/src/engine/lib/assets/src/___system/gizmo.c';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

let startObjectXShift = 0;
let startObjectYShift = 0;

let startMouseX = 0;
let startMouseY = 0;

let startObjectRotation = 0;

let invertedY = false;

const mouseHandlerGlobalUp = () => {
	if (___GizmoArrow.draggedArrow) {
		___GizmoArrow.draggedArrow.stopDragging();
	}
};

const p = new Point();

const mouseHandlerGlobalMove = (ev: PointerEvent) => {
	if (___GizmoArrow.draggedArrow && (!game.mouse.click || !game.editor.selection.length)) {
		___GizmoArrow.draggedArrow.stopDragging();
	}
	if (___GizmoArrow.draggedArrow) {

		const gizmo = ___GizmoArrow.draggedArrow.findParentByType(___Gizmo)!;

		if (___GizmoArrow.draggedArrow.dragX && ___GizmoArrow.draggedArrow.dragY && ev.shiftKey) {
			const dx = game.__mouse_uncropped.x - startMouseX;
			const dy = game.__mouse_uncropped.y - startMouseY;
			let angle = Math.atan2(dy, dx);
			let len = Math.sqrt(dx * dx + dy * dy);
			angle = Math.round((angle - gizmo.rotation) / (Math.PI / 4)) * (Math.PI / 4) + gizmo.rotation;
			p.x = startMouseX + Math.cos(angle) * len + startObjectXShift;
			p.y = startMouseY + Math.sin(angle) * len + startObjectYShift;
			___GizmoArrow.draggedArrow.snapGuide!.visible = true;
			___GizmoArrow.draggedArrow.snapGuide!.rotation = angle - gizmo.rotation;

		} else if (___GizmoArrow.draggedArrow.dragX || ___GizmoArrow.draggedArrow.dragY) {
			const dx = game.__mouse_uncropped.x - startMouseX;
			const dy = game.__mouse_uncropped.y - startMouseY;
			let angle = Math.atan2(dy, dx);
			let len = Math.sqrt(dx * dx + dy * dy);
			if (!___GizmoArrow.draggedArrow.dragY) {
				len *= Math.abs(Math.cos(angle - gizmo.rotation));
				angle = Math.round((angle - gizmo.rotation) / Math.PI) * Math.PI + gizmo.rotation;
			} else if (!___GizmoArrow.draggedArrow.dragX) {
				len *= Math.abs(Math.sin(angle - gizmo.rotation));
				angle = Math.round((angle - gizmo.rotation - Math.PI / 2) / Math.PI) * Math.PI + gizmo.rotation + Math.PI / 2;
			}
			p.x = startMouseX + Math.cos(angle) * len + startObjectXShift;
			p.y = startMouseY + Math.sin(angle) * len + startObjectYShift;
		}

		if (___GizmoArrow.draggedArrow.dragX || ___GizmoArrow.draggedArrow.dragY) {
			gizmo?.moveXY(p, ev.ctrlKey);
		}

		if (___GizmoArrow.draggedArrow.dragR) {
			let targetFullShift = (game.__mouse_uncropped.y - startMouseY) / -50;
			if (invertedY) {
				targetFullShift *= -1;
			}
			targetFullShift += startObjectRotation;
			if (ev.shiftKey) {
				targetFullShift = Math.round(targetFullShift / Math.PI * 8) * Math.PI / 8;
			}
			const dY = targetFullShift - game.editor.selection[0].rotation;
			game.editor.editProperty('rotation', dY, true);
		}
	}
};

window.addEventListener('pointermove', mouseHandlerGlobalMove);
window.addEventListener('pointerup', mouseHandlerGlobalUp);

export default class ___GizmoArrow extends Shape {

	static overedArrow?: ___GizmoArrow;
	static draggedArrow?: ___GizmoArrow;

	@editable()
	dragX = false;

	@editable()
	dragY = false;

	@editable()
	dragR = false;

	@editable()
	cursor = 'move';

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
		if (this.snapGuide) {
			this.snapGuide.visible = false;
		}
	}

	get isShowAngle() {
		return game.editor.selection.length && game.editor.selection[0].rotation !== 0;
	}

	onPointerOver() {
		if (!___GizmoArrow.draggedArrow) {
			StatusBar.addStatus('Alt + drag to clone object', 'gizmo-alt');
			if (this.dragR && this.isShowAngle) {
				StatusBar.addStatus('Right click to reset rotation', 'gizmo-right-click');
			}
			___GizmoArrow.overedArrow = this;
			this.shapeFillColor = 0xffff00;
			this.shapeLineColor = 0xffff00;
		}
	}

	onSelectionChange() {
		if (!game.__EDITOR_mode) {
			this.interactive = false; // pass first click to the game object.
			if (___GizmoArrow.overedArrow === this) {
				this.onPointerOut();
			}
		}
	}

	update(): void {
		super.update();
		if (!this.interactive) {
			this.interactive = !game.mouse.click;
		}
		if (___GizmoArrow.overedArrow === this && ((this.worldAlpha < 0.8) || !this.worldVisible)) {
			this.onPointerOut();
		}
	}

	onPointerOut() {
		___GizmoArrow.overedArrow = undefined;
		this._refreshColor();
		StatusBar.removeStatus('gizmo-alt');
		if (this.dragR) {
			StatusBar.removeStatus('gizmo-right-click');
		}
	}

	onPointerDown(ev: PointerEvent) {
		if (ev.buttons === 1) {

			invertedY = this.dragR && game.__mouse_uncropped.x > game.editor.selection[0].worldTransform.tx;

			startMouseX = game.__mouse_uncropped.x;
			startMouseY = game.__mouse_uncropped.y;

			game.stage.toLocal(game.editor.selection[0], game.editor.selection[0].parent, p);

			startObjectXShift = p.x - game.__mouse_uncropped.x;
			startObjectYShift = p.y - game.__mouse_uncropped.y;

			startObjectRotation = game.editor.selection[0].rotation;

			if (ev.altKey) {
				editorUtils.clone();
			}

			if (this.dragX && this.dragY) {
				StatusBar.addStatus('Shift - to snap direction', 'gizmo', 1);
			} else if (this.dragR) {
				StatusBar.addStatus('Shift - to snap angle', 'gizmo', 1);
			}

			___GizmoArrow.draggedArrow = this;
			this.isDowned = true;
		} else if (ev.buttons === 2 && this.dragR) {
			game.editor.editProperty('rotation', 0);
			stopRightButtonMoving();
		}
	}

	stopDragging() {
		___GizmoArrow.draggedArrow = undefined;
		if (this.snapGuide) {
			this.snapGuide.visible = false;
		}

		StatusBar.removeStatus('gizmo');

		this.isDowned = false;
		this._refreshColor();
	}

	_refreshColor() {
		if (___GizmoArrow.overedArrow !== this && ___GizmoArrow.draggedArrow !== this) {
			this.shapeFillColor = this.baseColor;
			this.shapeLineColor = this.baseLineColor;
		}
	}
}
