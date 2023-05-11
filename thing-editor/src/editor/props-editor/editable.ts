import { Container } from "pixi.js";
import { Constructor } from "thing-editor/src/editor/env";
import { SelectComponentItem } from "thing-editor/src/editor/ui/selectComponent";
import assert from "thing-editor/src/engine/debug/assert";

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
	name: string,
	type: EditablePropertyType,
	default?: number,
	__nullCheckingIsApplied?: true,
	visible?: (o: Container) => boolean,
	helpUrl?: string,
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

	if(!target.hasOwnProperty('__editableProps')) {
		target.__editableProps = [];
		assert(target.hasOwnProperty('__editableProps'), "Editable not own");
	}
	if(!editablePropertyDesc) {
		editablePropertyDesc = {};
	}
	editablePropertyDesc.name = name;

	target.__editableProps.push(editablePropertyDesc as EditablePropertyDesc);
};

export default editable;
export { _editableEmbed };

export type { EditablePropertyDesc, EditablePropertyType };