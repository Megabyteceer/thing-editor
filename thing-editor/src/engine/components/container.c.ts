
import { Container } from "pixi.js";
import { _editableEmbed } from "thing-editor/src/editor/props-editor/editable";

//@ts-ignore
Container.prototype.init = function () {

};

_editableEmbed(Container, 'x');

export default Container;

