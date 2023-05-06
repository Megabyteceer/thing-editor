import { Container } from "pixi.js";
import { SourceMappedConstructor } from "thing-editor/src/editor/env";

class __UnknownClass extends Container {
	static __defaultValues = {};
}
class __UnknownClassScene extends Screen {
	static __defaultValues = {};
}

(__UnknownClass as unknown as SourceMappedConstructor).__EDITOR_icon = "tree/unknown-class";
(__UnknownClassScene as unknown as SourceMappedConstructor).__EDITOR_icon = "tree/unknown-class";


export { __UnknownClass, __UnknownClassScene }