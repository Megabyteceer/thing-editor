PIXI.DisplayObject.prototype.getGlobalRotation = function getGlobalRotation() {
	var ret = this.rotation;
	var p = this.parent;
	while (p) {
		ret += p.rotation;
		p = p.parent;
	}
	return ret;
}

PIXI.DisplayObject.prototype.remove = function () {
	Lib.disposeObjectAndChildrens(this);
}

export default PIXI.DisplayObject;