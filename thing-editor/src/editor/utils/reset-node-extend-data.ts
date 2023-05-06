import { Container } from "pixi.js";


const resetNodeExtendData = (node: Container) => {
	if(node.__nodeExtendData) {

		//@ts-ignore
		delete node.__nodeExtendData;
	}
};

export default resetNodeExtendData;