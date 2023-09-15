

import { Point, Renderer } from "pixi.js";
import { KeyedObject } from "thing-editor/src/editor/env";
import { EditablePropertyDesc, EditableRect } from "thing-editor/src/editor/props-editor/editable";
import overlayLayer from "thing-editor/src/editor/ui/editor-overlay";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import Container from "thing-editor/src/engine/lib/assets/src/basic/container.c";
import Shape from "thing-editor/src/engine/lib/assets/src/extended/shape.c";

const p = new Point();

export default class ___RectGuide extends Shape {

	owner!: Container;
	rect!: EditableRect;
	field!: EditablePropertyDesc;
	rectKey!: string;

	render(renderer: Renderer): void {
		if(!this.owner) {
			super.render(renderer);
			return;
		} else if(!this.isShouldBeRemoved()) {
			this.shapeLineColor = this.field.guideColor || 53546;
			p.x = this.owner.pivot.x + this.rect.x;
			p.y = this.owner.pivot.y + this.rect.y;
			this.parent.toLocal(p, this.owner, this);
			this.width = this.rect.w;
			this.height = this.rect.h;
			this.shapeLineWidth = Math.ceil(game.editor.ui.viewport.viewportScale);
			this.updateTransform();
			super.render(renderer);
		}
	}

	isShouldBeRemoved() {
		if(!this.owner.__nodeExtendData || (this.owner.__nodeExtendData as KeyedObject)[this.rectKey] !== this) {
			return true;
		} else if(!this.owner.__nodeExtendData.isSelected || (this.owner as KeyedObject)[this.field.name] !== this.rect) {
			delete (this.owner.__nodeExtendData as KeyedObject)[this.rectKey];
			return true;
		}
	}

	update(): void {
		if(this.isShouldBeRemoved()) {
			this.owner = null!;
			this.__nodeExtendData.constructorCalled = false;
			this.remove();
		} else {
			super.update();
		}
	}

	static show(owner: Container, field: EditablePropertyDesc, rect: EditableRect) {
		let rectGuide: ___RectGuide;
		const rectKey = '___rectangleRef_' + field.name;
		if(!owner.__nodeExtendData.hasOwnProperty(rectKey)) {
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
