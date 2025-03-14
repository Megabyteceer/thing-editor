

import type { Renderer } from 'pixi.js';
import { Point } from 'pixi.js';
import overlayLayer from 'thing-editor/src/editor/ui/editor-overlay';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

const p = new Point();
const p2 = new Point();

export default class ___RectGuide extends Shape {

	owner!: Container;
	rect!: EditableRect;
	field!: EditablePropertyDesc;
	rectKey!: string;

	render(renderer: Renderer): void {
		if (!this.owner) {
			super.render(renderer);
			return;
		} else if (!this.isShouldBeRemoved()) {

			this.rotation = this.owner.parent.getGlobalRotation();
			this.shapeLineColor = this.field.guideColor || 53546;
			p.x = this.rect.x + this.owner.pivot.x;
			p.y = this.rect.y + this.owner.pivot.y;

			this.parent.toLocal(p, this.owner, this);

			p.x += this.rect.w;
			p.y += this.rect.h;
			let tmpX = this.owner.scale.x;
			let tmpY = this.owner.scale.y;
			if (this.field.rectScaleIgnore) {
				this.owner.scale.x = this.owner.scale.y = 1;
			}
			this.toLocal(p, this.owner, p2);
			if (this.field.rectScaleIgnore) {
				this.owner.scale.x = tmpX;
				this.owner.scale.y = tmpY;
			}
			this.width = p2.x;
			this.height = p2.y;
			this.shapeLineWidth = Math.ceil(game.editor.ui.viewport.viewportScale);
			this.updateTransform();
			super.render(renderer);
		}
	}

	isShouldBeRemoved() {
		if (!this.owner.__nodeExtendData || (this.owner.__nodeExtendData as KeyedObject)[this.rectKey] !== this) {
			return true;
		}
		if (!this.owner.__nodeExtendData.isSelected || (this.owner as KeyedObject)[this.field.name] !== this.rect) {
			delete (this.owner.__nodeExtendData as KeyedObject)[this.rectKey];
			return true;
		}
	}

	update(): void {
		if (this.isShouldBeRemoved()) {
			this.owner = null!;
			this.__nodeExtendData.constructorCalled = false;
			this.remove();
		} else {
			this.visible = (!this.field.visible) || this.field.visible(this.owner);
			super.update();
		}
	}

	static show(owner: Container, field: EditablePropertyDesc, rect: EditableRect) {
		let rectGuide: ___RectGuide;
		const rectKey = '___rectangleRef_' + field.name;
		if (!owner.__nodeExtendData.hasOwnProperty(rectKey)) {
			rectGuide = Lib.loadPrefab('___system/rect-guide') as ___RectGuide;
			rectGuide.owner = owner;
			rectGuide.rect = rect;
			rectGuide.field = field;
			rectGuide.rectKey = rectKey;
			(owner.__nodeExtendData as KeyedObject)[rectKey] = rectGuide;
			overlayLayer.addChild(rectGuide);
		}
	}
}
