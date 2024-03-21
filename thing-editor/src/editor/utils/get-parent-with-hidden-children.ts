import type { Container } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';

export default function getParentWhichHideChildren(child: Container, closest = false): Container | undefined {
	let parents = [];
	let o = child;
	while (o) {
		parents.unshift(o);
		o = o.parent;
	}

	if (closest) {
		parents.reverse();
	}

	for (let i = 0; i < parents.length; i++) {
		o = parents[i];

		let extendData = o.__nodeExtendData;

		if (extendData.hidden) {
			if (!closest) {
				assert(i > 0, 'Cannot get parent hides children.');
				o = parents[i - 1];
				if (o !== child) {
					return o;
				}
			} else {
				assert(i < (parents.length - 1), 'Cannot get parent hides children.');
				o = parents[i + 1];
				if (o !== child) {
					return o;
				}
			}
		}
		if (o.__hideChildren) {
			if (o !== child) {
				return o;
			}
		}
	}
}
