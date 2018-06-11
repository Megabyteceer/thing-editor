let BtnProperty = (props) => {
	
	let field = props.field;
	
	return R.btn(field.name, () => {
		editor.selection.some(field.onClick);
	}, field.title, field.className);
};

export default BtnProperty