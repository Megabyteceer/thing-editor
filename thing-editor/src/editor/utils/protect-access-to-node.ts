import { SelectableProperty } from "thing-editor/src/editor/env";
import { ContainerType } from "thing-editor/src/engine/components/container.c";
import assert from "thing-editor/src/engine/debug/assert";

const protectAccessToSceneNode = (o: ContainerType, debugName: string) => {
	o.remove = () => {
		assert(false, "Attempt to remove system node" + debugName, 10002);
	};
	o.destroy = () => {
		assert(false, "Attempt to destroy system node " + debugName, 10003);
	};
	o.detachFromParent = () => {
		assert(false, "Attempt to detachFromParent system node " + debugName, 10004);
	};
	(o as SelectableProperty).___EDITOR_isHiddenForChooser = true;
}

export default protectAccessToSceneNode;