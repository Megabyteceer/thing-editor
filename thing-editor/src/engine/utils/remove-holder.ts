import { Container } from "pixi.js";

class RemoveHolder extends Container {
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