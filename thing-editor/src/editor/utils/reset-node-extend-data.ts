import { DisplayObjectType } from "thing-editor/src/engine/display-object";

const resetNodeExtendData = (node: DisplayObjectType) => {
	if(node.__nodeExtendData) {

		//@ts-ignore
		delete node.__nodeExtendData;
	}
};

export default resetNodeExtendData;