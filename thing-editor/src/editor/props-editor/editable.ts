import type { Container, DisplayObject } from 'pixi.js';
import type { FileDesc } from 'thing-editor/src/editor/fs';
import { getPropertyDefinitionUrl } from 'thing-editor/src/editor/ui/props-editor/get-property-definition-url';
import type { SelectEditorItem } from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import type { Hotkey } from 'thing-editor/src/editor/utils/hotkey';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

interface EditableRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

type EditablePropertyType = keyof IEditablePropertyType;

interface EditablePropertyDescRaw<T extends DisplayObject = DisplayObject> {
	min?: number;
	max?: number;
	step?: number;
	type?: EditablePropertyType;
	name?: string;
	basis?: number;
	default?: any;
	canBeEmpty?: false;
	visible?: (o: T) => boolean;
	helpUrl?: string;
	/** field changes pass vale through this function  */
	parser?: (val: any) => any;
	disabled?: (o: T) => string | undefined | boolean | null;
	beforeEdited?: (val: any) => void;
	onBlur?: () => void;
	onClick?: (ev: any) => void;
	className?: string;
	hotkey?: Hotkey;

	/** filter assets for selector */
	filterAssets?: (file: FileDesc) => boolean;

	/** splitter header */
	title?: string;
	animate?: true;
	select?: SelectEditorItem[] | (() => SelectEditorItem[]);
	noNullCheck?: true;
	important?: boolean;
	tip?: string | (() => string | undefined);
	afterEdited?: () => void;
	multiline?: boolean;
	notSerializable?: true;
	override?: true;
	filterName?: string;
	arrayProperty?: true;
	defaultArrayItemValue?: any;
	separator?: true;

	guideColor?: number;

	rect_minX?: number;
	rect_maxX?: number;
	rect_minY?: number;
	rect_maxY?: number;
	rect_minW?: number;
	rect_maxW?: number;
	rect_minH?: number;
	rect_maxH?: number;

	/** call-back and data-path properties validator */
	isValueValid?: (val: any) => boolean;

}

interface EditablePropertyDesc<T extends Container = Container> extends EditablePropertyDescRaw<T> {
	class: SourceMappedConstructor;
	type: EditablePropertyType;
	default: any;
	name: string;
	__src: string;
	__nullCheckingIsApplied?: true;
	renderer?: any;
	isTranslatableKey?: boolean;
}

/** editable property decorator */
function editable<T extends DisplayObject>(editablePropertyDesc?: EditablePropertyDescRaw<T>) {
	return function (target: T, propertyName: string) {
		editableInner(target, propertyName, editablePropertyDesc);
	};
}

/* Allows to define editable properties to the classes we has no access to source code.
To define editable properties for your own classes, please use '@editable()' decorator instead */
function _editableEmbed<T extends DisplayObject>(target: SourceMappedConstructor | SourceMappedConstructor[], propertyName: string, editablePropertyDesc?: EditablePropertyDescRaw<T>) {


	if (editablePropertyDesc && !editablePropertyDesc.name) {
		editablePropertyDesc.name = propertyName;
	}

	if (Array.isArray(target)) {
		for (let t of target) {
			editableInner(t.prototype as any, propertyName, editablePropertyDesc);
		}
	} else {
		editableInner(target.prototype as any, propertyName, editablePropertyDesc);
	}
}

function editableInner<T extends DisplayObject>(target: T, name: string, editablePropertyDesc?: EditablePropertyDescRaw<T>) {

	if (!target.constructor.hasOwnProperty('__editablePropsRaw')) {
		(target.constructor as SourceMappedConstructor).__editablePropsRaw = [];
		assert(target.constructor.hasOwnProperty('__editablePropsRaw'), 'Editable not own');
	}
	if (!editablePropertyDesc) {
		editablePropertyDesc = {};
	}

	if (editablePropertyDesc.hasOwnProperty('name')) {
		name = editablePropertyDesc.name!;
	}

	if (editablePropertyDesc.type === 'btn') {
		editablePropertyDesc.notSerializable = true;
		assert(editablePropertyDesc.name, 'property with type \'btn\' should have \'name\'. ');
	}
	editablePropertyDesc.name = name;

	let er = new Error('tmpError');
	let stack = (er.stack as string).split('\n');
	let lineIndex = stack.findIndex(line => line.indexOf('__decorateClass') > 0) + 1;
	if (lineIndex === 0) {
		lineIndex = stack.findIndex(line => line.indexOf('_editableEmbed') > 0) + 1;
	}

	let srcUrl = stack[lineIndex];

	let url = srcUrl.split(window.location.origin)[1];
	url = url.split(/[?:]/)[0];
	url = getPropertyDefinitionUrl(url, name, target as any);
	(editablePropertyDesc as EditablePropertyDesc).__src = url;

	(target.constructor as SourceMappedConstructor).__editablePropsRaw.push(editablePropertyDesc as EditablePropertyDesc);
}

export default editable;
export { _editableEmbed, propertyAssert };
export type { EditablePropertyDesc, EditablePropertyDescRaw, EditablePropertyType, EditableRect };


const propertyAssert = (prop: EditablePropertyDesc, condition: any, message: string) => {
	if (!condition) {
		if (prop.__src) {
			game.editor.editSource(prop.__src);
		}
		message = 'Editable property "' + prop.name + '" of class "' + prop.class.__className + '" validation error: \n' + message;
		assert(condition, message);
	}
};
