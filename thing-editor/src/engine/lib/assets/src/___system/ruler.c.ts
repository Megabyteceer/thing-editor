
import { Point } from 'pixi.js';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import type { SelectionData } from 'thing-editor/src/editor/utils/selection';
import game from 'thing-editor/src/engine/game';
import Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';
import type Shape from '../extended/shape.c';

const p = new Point();

export default class ___Ruler extends Container {

	startPoint = new Point();
	startPointView!: Container;
	startContainer!: Container;
	startPointInfo!: Container;
	sizeInfo!: Container;
	zeroPointView!: Container;
	sizeInfoRect!: Container;
	guides!: Shape[];
	reflectedGuide!: Shape;

	selectionSavedData!: SelectionData;

	currentContainer!: Container;

	W = 0;
	H = 0;

	interval = 0;


	constructor() {
		super();
		this.updateRuler = this.updateRuler.bind(this);
		this.onPlayToggle = this.onPlayToggle.bind(this);
	}

	initRuler() {

		this.interval = window.setInterval(this.updateRuler, 16);
		editorEvents.on('playToggle', this.onPlayToggle);
		this.startPoint.y =
		this.startPoint.x = 0;

		EDITOR_FLAGS.blockSelectByStageClick++;
		this.zeroPointView = this.findChildByName('zero-point-view') as Shape;
		this.startPointInfo = this.findChildByName('start-point-info') as Shape;
		this.startPointView = this.findChildByName('start-point') as Shape;
		this.sizeInfo = this.findChildByName('size-info') as Shape;
		this.sizeInfoRect = this.findChildByName('size-info-rect') as Shape;
		this.reflectedGuide = this.findChildByName('reflected-guide') as Shape;
		this.guides = this.findChildrenByName('guide') as Shape[];
		this.startContainer = game.editor.selection[0] || game.currentContainer;

		this.parent.toLocal(this.startContainer, this.startContainer.parent, this);
		this.selectionSavedData = game.editor.selection.saveSelection();

		game.editor.selection.clearSelection();

		this.currentContainer = game.currentContainer;

		game.mouse.click = 0;
	}

	updateRuler() {

		if (
			this.currentContainer !== game.currentContainer ||
			game.mouse.click === 2 ||
			game.keys.isKeycodePressed(27)
		) {
			this.removeRuler();
			return;
		}

		super.update();

		if (this.startContainer) {
			this.parent.toLocal(this.startContainer, this.startContainer.parent, this);
		}

		if (game.mouse.click === 1) {
			this.startContainer.toLocal(game.__mouse_uncropped, game.currentContainer, this.startPoint);
		}

		this.startPointView.parent.toLocal(this.startPoint, this.startContainer, this.startPointView);

		this.startPointView.toLocal(game.__mouse_uncropped, game.currentContainer, p);

		if (game.keys.shiftKey) {
			const size = Math.max(Math.abs(p.x), Math.abs(p.y));
			p.x = Math.sign(p.x) * size;
			p.y = Math.sign(p.y) * size;
		}


		for (const g of this.guides) {
			g.visible = !!(Math.abs(p.x) > 0.5 && Math.abs(p.y) > 0.5);
			if (g.visible) {
				g.width = Math.abs(p.x);
				if (p.x > 0) {
					g.x = 0;
				} else {
					g.x = p.x;
				}
				g.height = Math.abs(p.y);
				if (p.y > 0) {
					this.startPointInfo.scale.y = 1;
					g.y = 0;
				} else {
					this.startPointInfo.scale.y = -1;
					g.y = p.y;
				}
			}
		}

		if (p.x > -1) {
			this.startPointInfo.scale.x = 1;
		} else {
			this.startPointInfo.scale.x = -1;
		}
		if (p.y > -1) {
			this.startPointInfo.scale.y = 1;
		} else {
			this.startPointInfo.scale.y = -1;
		}

		this.W = Math.round(Math.abs(p.x / game.stage.scale.x));
		this.H = Math.round(Math.abs(p.y / game.stage.scale.x));

		this.sizeInfo.x = p.x;
		this.sizeInfo.y = p.y;

		this.sizeInfo.scale.x = this.startPointInfo.scale.x;
		this.sizeInfo.children[0].scale.x =
		this.startPointInfo.children[0].scale.x = Math.sign(this.startPointInfo.scale.x);

		this.sizeInfo.scale.y = this.startPointInfo.scale.y;
		this.sizeInfo.children[0].scale.y =
		this.startPointInfo.children[0].scale.y = Math.sign(this.startPointInfo.scale.y);

		this.reflectedGuide.visible = this.guides[0].visible;
		this.reflectedGuide.width = this.guides[0].width * 2;
		this.reflectedGuide.height = this.guides[0].height * 2;
		this.reflectedGuide.x = this.reflectedGuide.width / -2;
		this.reflectedGuide.y = this.reflectedGuide.height / -2;


		this.parent.toLocal(this.sizeInfoRect, this.sizeInfoRect.parent, p);
		const leftEdge = this.sizeInfoRect.width;
		const topEdge = this.sizeInfoRect.height;
		const rightEdge = game.W - this.sizeInfoRect.width;
		const bottomEdge = game.H - this.sizeInfoRect.height;
		if (p.x < leftEdge) {
			this.sizeInfo.x += leftEdge - p.x;
		}
		if (p.x > rightEdge) {
			this.sizeInfo.x -= (p.x - rightEdge);
		}
		if (p.y < topEdge) {
			this.sizeInfo.y += topEdge - p.y;
		}
		if (p.y > bottomEdge) {
			this.sizeInfo.y -= (p.y - bottomEdge);
		}
		this.zeroPointView.scale.x = this.zeroPointView.scale.y = game.stage.scale.x;

	}

	onPlayToggle() {
		this.removeRuler();
	}

	removeRuler() {
		clearInterval(this.interval);
		game.editor.selection.loadSelection(this.selectionSavedData);
		this.startPointView = null!;
		this.sizeInfoRect = null!;
		this.sizeInfo = null!;
		this.zeroPointView = null!;
		this.startContainer = null!;
		this.reflectedGuide = null!;
		this.currentContainer = null!;
		editorEvents.off('playToggle', this.onPlayToggle);
		EDITOR_FLAGS.blockSelectByStageClick--;
		this.remove();
	}
}
