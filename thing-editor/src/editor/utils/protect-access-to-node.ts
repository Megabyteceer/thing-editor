import type { Container } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';

const protectAccessToSceneNode = (o: Container, debugName: string) => {
	o.name = debugName;
	o.__nodeExtendData = {};
	o.remove = () => {
		assert(false, 'Attempt to remove system node' + debugName, 10002);
	};
	o.destroy = () => {
		assert(false, 'Attempt to destroy system node ' + debugName, 10003);
	};
	o.detachFromParent = () => {
		assert(false, 'Attempt to detachFromParent system node ' + debugName, 10004);
	};
	(o as SelectableProperty).___EDITOR_isHiddenForChooser = true;
};

export default protectAccessToSceneNode;
