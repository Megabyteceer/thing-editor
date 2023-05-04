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
	isArray?: true,
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
		if(!target.__editableProps) {
			target.__editableProps = [];
		}
		if(!editablePropertyDesc) {
			editablePropertyDesc = {};
		}
		editablePropertyDesc.name = name;
		target.__editableProps.push(editablePropertyDesc);
	};
}

export default editable;

export type { EditablePropertyDesc };