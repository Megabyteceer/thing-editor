import type { Container } from 'pixi.js';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

export default async function exportAsPng(object: Container, width = 0, height = 0, cropAlphaThreshold = 1) {

	if (object.width > 0 && object.height > 0) {
		let tmpVisible = object.visible;
		object.visible = true;
		let oldParent = object.parent;
		let oldIndex = 0;
		if (oldParent) {
			oldIndex = oldParent.children.indexOf(object);
		}
		let f = object.filters;
		let c = Lib._loadClassInstanceById('Container');
		let c2 = Lib._loadClassInstanceById('Container');
		c.addChild(object);
		c2.addChild(c);

		object.filters = [];
		game.editor.ui.modal.showSpinner();

		let b = c.getLocalBounds();

		let canvas = game.pixiApp.renderer.plugins.extract.canvas(c);
		let ctx = canvas.getContext('2d', {
			alpha: true
		});
		let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

		let cropTop = 0;
		while (cropTop < canvas.height) {
			let isEmptyLine = true;
			let y = cropTop * canvas.width * 4 + 3;
			for (let x = 0; x < canvas.width; x++) {
				if (imageData[x * 4 + y] >= cropAlphaThreshold) {
					isEmptyLine = false;
					break;
				}
			}
			if (!isEmptyLine) {
				break;
			}
			cropTop++;
		}

		let cropBottom = 0;
		while (cropBottom < canvas.height) {
			let isEmptyLine = true;
			let y = (canvas.height - 1 - cropBottom) * canvas.width * 4 + 3;
			for (let x = 0; x < canvas.width; x++) {
				if (imageData[x * 4 + y] >= cropAlphaThreshold) {
					isEmptyLine = false;
					break;
				}
			}
			if (!isEmptyLine) {
				break;
			}
			cropBottom++;
		}

		let cropLeft = 0;
		while (cropLeft < canvas.width) {
			let isEmptyLine = true;
			let x = cropLeft * 4 + 3;
			for (let y = 0; y < canvas.height; y++) {
				if (imageData[x + y * canvas.width * 4] >= cropAlphaThreshold) {
					isEmptyLine = false;
					break;
				}
			}
			if (!isEmptyLine) {
				break;
			}
			cropLeft++;
		}

		let cropRight = 0;
		while (cropRight < canvas.width) {
			let isEmptyLine = true;
			let x = (canvas.width - 1 - cropRight) * 4 + 3;
			for (let y = 0; y < canvas.height; y++) {
				if (imageData[x + y * canvas.width * 4] >= cropAlphaThreshold) {
					isEmptyLine = false;
					break;
				}
			}
			if (!isEmptyLine) {
				break;
			}
			cropRight++;
		}

		b.y += cropTop;
		b.height -= cropTop + cropBottom;
		b.x += cropLeft;
		b.width -= cropLeft + cropRight;

		let b2 = c2.getLocalBounds();
		c2.getLocalBounds = () => {
			return b2;
		};

		if (width > 0 && height > 0) {

			b2.x = 0;
			b2.y = 0;
			b2.width = width;
			b2.height = height;

			let scale = Math.min(width / b.width, height / b.height);
			b.y *= scale;
			b.x *= scale;
			b.width *= scale;
			b.height *= scale;

			c.scale.x = c.scale.y = scale;
			c.x = -b.x + (width - b.width) / 2;
			c.y = -b.y + (height - b.height) / 2;
		} else {
			b2.y += cropTop;
			b2.height -= cropTop + cropBottom;
			b2.x += cropLeft;
			b2.width -= cropLeft + cropRight;
			if (b2.x < 0) {
				b2.x = Math.floor(b2.x);
			} else {
				b2.x = Math.ceil(b2.x);
			}
			if (b2.y < 0) {
				b2.y = Math.floor(b2.y);
			} else {
				b2.y = Math.ceil(b2.y);
			}
		}

		canvas = game.pixiApp.renderer.plugins.extract.canvas(c2);

		let png: Blob = await new Promise((resolve) => {
			canvas.toBlob(resolve, 'image/png');
		});
		object.visible = tmpVisible;

		delete (c2 as any).getLocalBounds;
		object.filters = f;
		if (oldParent) {
			oldParent.addChildAt(object, oldIndex);
		} else {
			object.detachFromParent();
		}
		game.editor.ui.modal.hideSpinner();
		return png;
	}
}
