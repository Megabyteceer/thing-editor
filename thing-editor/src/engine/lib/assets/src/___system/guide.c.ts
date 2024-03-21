import type { Container } from 'pixi.js';
import { Point } from 'pixi.js';
import overlayLayer from 'thing-editor/src/editor/ui/editor-overlay';
import Lib from 'thing-editor/src/engine/lib';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';

const all: Map<string, ___Guide> = new Map();

const p = new Point();

export default class ___Guide extends MovieClip {

	id?: string;

	remove() {
		all.delete(this.id!);
		Lib.destroyObjectAndChildren(this);
	}

	refresh(x: number, y: number, rotation: number, owner: Container) {
		p.x = x;
		p.y = y;
		this.parent.toLocal(p, owner, this);
		this.rotation = owner.getGlobalRotation() + rotation;
		this.gotoLabelRecursive('refresh');
	}

	static hide(id: string) {
		all.get(id)?.remove();
	}

	static show(x: number, y: number, rotation: number, id: string, owner: Container) {
		let guide: ___Guide;
		if (!all.has(id)) {
			guide = Lib.loadPrefab('___system/guide') as ___Guide;
			guide.id = id;
			all.set(id, guide);
			overlayLayer.addChild(guide);
		} else {
			guide = all.get(id)!;
		}
		guide.refresh(x, y, rotation, owner);
	}
}
