import MovieClip from "./movie-clip/movie-clip.js";

const emtyFunction = () =>{};
PIXI.Container.prototype.update = emtyFunction;
PIXI.Container.prototype.init = emtyFunction;
PIXI.Container.prototype.onRemove = emtyFunction;

var _labelName;
const gotoLabelAndPlay = (m)  => {
	if (m.hasLabel(_labelName)) {
		m.gotoLabel(_labelName);
	}
};

PIXI.Container.prototype.gotoLabelRecursive = function (labelName) {
	_labelName = labelName;
	if(this instanceof MovieClip) {
		gotoLabelAndPlay(this);
	}
	this.findChildrenByType(MovieClip).some(gotoLabelAndPlay);
}

export default PIXI.Container;

/// #if EDITOR
PIXI.Container.EDITOR_icon = 'tree/container';
/// #endif