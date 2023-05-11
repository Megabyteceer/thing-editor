import { Container } from "pixi.js";
import { Constructor, SourceMappedConstructor } from "thing-editor/src/editor/env";
import { getPropertyDefinitionUrl } from "thing-editor/src/editor/ui/props-editor/property-definition-utl";
import { SelectComponentItem } from "thing-editor/src/editor/ui/selectComponent";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";

type EditablePropertyType = 'data-path' |
	'splitter' |
	'rect' |
	'callback' |
	'timeline' |
	'ref' |
	'btn' |
	'color' |
	'boolean' |
	'string' |
	'prefab' |
	'number';

interface EditablePropertyDescRaw {
	min?: number,
	max?: number,
	step?: number,
	type?: EditablePropertyType,
	name?: string,
	basis?: number,
	default?: any,
	visible?: (o: Container) => boolean,
	helpUrl?: string,
	/** field changes pass vale through this function  */
	parser?: (val: any) => any;
	disabled?: (o: Container) => boolean;
	beforeEdited?: (val: any) => void;
	onBlur?: () => void;

	/** splitter header */
	title?: string,
	isArray?: true,
	notAnimate?: true,
	select?: SelectComponentItem[] | (() => SelectComponentItem[])
	noNullCheck?: true,
	important?: true;
	tip?: string | (() => string);
	afterEdited?: () => void;
	multiline?: boolean;
	notSerializable?: true;
	override?: true;
}

interface EditablePropertyDesc extends EditablePropertyDescRaw {
	type: EditablePropertyType,
	default: any,
	name: string,
	__src: string,
	__nullCheckingIsApplied?: true,
	renderer?: any;
}

/** editable property decorator */
function editable(editablePropertyDesc?: EditablePropertyDescRaw) {
	return function (target: any, propertyName: string, _descriptor?: PropertyDescriptor) {
		editableInner(target, propertyName, editablePropertyDesc);
	}
}

function _editableEmbed(target: Constructor, propertyName: string, editablePropertyDesc?: EditablePropertyDescRaw) {
	editableInner(target.prototype, propertyName, editablePropertyDesc);
}

function editableInner(target: Container, name: string, editablePropertyDesc?: EditablePropertyDescRaw) {

	if(!target.constructor.hasOwnProperty('__editableProps')) {
		(target.constructor as SourceMappedConstructor).__editableProps = [];
		assert(target.constructor.hasOwnProperty('__editableProps'), "Editable not own");
	}
	if(!editablePropertyDesc) {
		editablePropertyDesc = {};
	}
	editablePropertyDesc.name = name;
	let er = new Error("tmpError");
	let stack = (er.stack as string).split('\n');
	let lineIndex = stack.findIndex(line => line.indexOf('__decorateClass') > 0) + 1;
	if(lineIndex === 0) {
		lineIndex = stack.findIndex(line => line.indexOf('_editableEmbed') > 0) + 1;
	}

	let srcUrl = stack[lineIndex];

	let url = srcUrl.split(location.origin)[1];
	url = url.split(/[?:]/)[0];
	url = getPropertyDefinitionUrl(url, name);
	(editablePropertyDesc as EditablePropertyDesc).__src = url;

	(target.constructor as SourceMappedConstructor).__editableProps.push(editablePropertyDesc as EditablePropertyDesc);
};

export default editable;
export { _editableEmbed, propertyAssert };

export type { EditablePropertyDesc, EditablePropertyType };

const propertyAssert = (prop: EditablePropertyDesc, condition: any, message: string) => {
	if(!condition) {
		game.editor.editSource(prop.__src)
		assert(condition, message);
	}
}
