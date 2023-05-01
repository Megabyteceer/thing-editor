type EditablePropertyType = 'data-path' | 'splitter' | 'rect' | 'callback' | 'ref' | 'btn' | 'color' | 'bool' | 'string' | 'number';

interface EditablePropertyDesc {
	default?: number,
	min?: number,
	max?: number,
	step?: number,
	type?: EditablePropertyType,
	name?: string,
	isArray?: true
}

function editable(editablePropertyDesc?: EditablePropertyDesc) {
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