import { Container } from 'pixi.js';
import type { DebugStack } from 'thing-editor/src/editor/utils/stack-utils';
import { removeHoldersToCleanup } from 'thing-editor/src/engine/lib';

class RemoveHolder extends Container {
	constructor() {
		super();
		this.visible = false;
	}

	/// #if EDITOR
	stack!: DebugStack;
	/// #endif

	onRemove() {
		super.onRemove();
		let i = removeHoldersToCleanup.indexOf(this);
		if (i >= 0) {
			removeHoldersToCleanup.splice(i, 1);
		}
	}
	update() { /* empty */ }
}

export default RemoveHolder;
