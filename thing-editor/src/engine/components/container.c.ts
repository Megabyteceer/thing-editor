
import editable from "thing-editor/src/editor/props-editor/editable";
import { PIXI } from "thing-editor/src/engine/game";

const Container = PIXI.Container;
type ContainerType = PIXI.Container;

//@ts-ignore
Container.prototype.init = function () {


}

editable()(Container.prototype, 'x');

export default Container;

export type { ContainerType };