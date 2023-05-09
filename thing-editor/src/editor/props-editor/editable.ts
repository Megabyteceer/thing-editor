import { Container } from "pixi.js";
import { SelectComponentItem } from "thing-editor/src/editor/ui/selectComponent";
import assert from "thing-editor/src/engine/debug/assert";

type EditablePropertyType = 'data-path' |
	'splitter' |
	'rect' |
	'callback' |
	'ref' |
	'btn' |
	'color' |
	'bool' |
	'string' |
	'prefab' |
	'number';

interface EditablePropertyDescRaw {
	min?: number,
	max?: number,
	step?: number,
	type?: EditablePropertyType,
	name?: string,
	/** field changes pass vale through this function  */
	parser?: (val: any) => any;
	disabled?: (o: Container) => boolean;
	beforeEdited?: (val: any) => void;
	onBlur?: (val: any) => void;

	/** splitter header */
	title?: string,
	isArray?: true,
	notAnimate?: true,
	select?: SelectComponentItem[] | (() => SelectComponentItem[])
	noNullCheck?: true,
}

interface EditablePropertyDesc extends EditablePropertyDescRaw {
	name: string,
	type: EditablePropertyType,
	default?: number,
	__nullCheckingIsApplied?: true,
	notSerializable?: true,
}

/** editable property decorator */
function editable(editablePropertyDesc?: EditablePropertyDescRaw) {
	return function (target: any, name: string, _descriptor?: PropertyDescriptor) {
		_editableEmbed(target, name, editablePropertyDesc);
	}
}

function _editableEmbed(target: any, name: string, editablePropertyDesc?: EditablePropertyDescRaw) {

	if(!target.hasOwnProperty('__editableProps')) {
		target.__editableProps = [];
		assert(target.hasOwnProperty('__editableProps'), "Editable not own");
	}
	if(!editablePropertyDesc) {
		editablePropertyDesc = {};
	}
	editablePropertyDesc.name = name;
	target.__editableProps.push(editablePropertyDesc);
};

export default editable;
export { _editableEmbed };

export type { EditablePropertyDesc };