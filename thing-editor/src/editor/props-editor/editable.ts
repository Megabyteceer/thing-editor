import { Container, DisplayObject } from "pixi.js";
import { Constructor, SourceMappedConstructor } from "thing-editor/src/editor/env";
import { getPropertyDefinitionUrl } from "thing-editor/src/editor/ui/props-editor/get-property-definition-url";
import { SelectEditorItem } from "thing-editor/src/editor/ui/props-editor/props-editors/select-editor";
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
	'pow-damp-preset' |
	'number';

interface EditablePropertyDescRaw<T extends DisplayObject> {
	min?: number,
	max?: number,
	step?: number,
	type?: EditablePropertyType,
	name?: string,
	basis?: number,
	default?: any,
	visible?: (o: T) => boolean,
	helpUrl?: string,
	/** field changes pass vale through this function  */
	parser?: (val: any) => any;
	disabled?: (o: T) => boolean;
	beforeEdited?: (val: any) => void;
	onBlur?: () => void;

	/** splitter header */
	title?: string,
	isArray?: true,
	notAnimate?: true,
	select?: SelectEditorItem[] | (() => SelectEditorItem[])
	noNullCheck?: true,
	important?: boolean;
	tip?: string | (() => string);
	afterEdited?: () => void;
	multiline?: boolean;
	notSerializable?: true;
	override?: true;
	filterName?: string;
}

interface EditablePropertyDesc<T extends Container = Container> extends EditablePropertyDescRaw<T> {
	class: SourceMappedConstructor,
	type: EditablePropertyType,
	default: any,
	name: string,
	__src: string,
	__nullCheckingIsApplied?: true,
	renderer?: any;
	isTranslatableKey?: boolean;
	onClick?: (ev: any) => void;

	/** call-back and data-path properties validator */
	isValueValid?: (val: any) => boolean;

	/** check if field is image select dropdown*/
	__isImage?: boolean;
}

/** editable property decorator */
function editable<T extends DisplayObject>(editablePropertyDesc?: EditablePropertyDescRaw<T>) {
	return function (target: T, propertyName: string, _descriptor?: PropertyDescriptor<T>) {
		editableInner(target, propertyName, editablePropertyDesc);
	}
}

/* Allows to define editable properties to the classes we has no access to source code.
To define editable properties for your own classes, please use '@editable()' decorator instead */
function _editableEmbed<T extends DisplayObject>(target: Constructor | Constructor[], propertyName: string, editablePropertyDesc?: EditablePropertyDescRaw<T>) {
	if(Array.isArray(target)) {
		for(let t of target) {
			editableInner(t.prototype, propertyName, editablePropertyDesc);
		}
	} else {
		editableInner(target.prototype, propertyName, editablePropertyDesc);
	}
}

function editableInner<T extends DisplayObject>(target: T, name: string, editablePropertyDesc?: EditablePropertyDescRaw<T>) {

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
	url = getPropertyDefinitionUrl(url, name, target as any);
	(editablePropertyDesc as EditablePropertyDesc).__src = url;

	(target.constructor as SourceMappedConstructor).__editableProps.push(editablePropertyDesc as EditablePropertyDesc);
};

export default editable;
export { _editableEmbed, propertyAssert };
export type { EditablePropertyDesc, EditablePropertyDescRaw, EditablePropertyType };


const propertyAssert = (prop: EditablePropertyDesc, condition: any, message: string) => {
	if(!condition) {
		game.editor.editSource(prop.__src)
		message = 'Editable property "' + prop.name + '" of class "' + prop.class.__className + '" validation error: \n' + message
		assert(condition, message);
	}
}
