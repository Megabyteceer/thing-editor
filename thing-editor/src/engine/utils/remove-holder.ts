import { PIXI } from "thing-editor/src/engine/game";

class RemoveHolder extends PIXI.Container {
	constructor() {
		super();
		this.visible = false;
	}
	onRemove() {
		super.onRemove();
		let i = removeHoldersToCleanup.indexOf(this);
		if(i >= 0) {
			removeHoldersToCleanup.splice(i, 1);
		}
	}
	update() { }
}

const removeHoldersToCleanup: RemoveHolder[] = [];

export default RemoveHolder;