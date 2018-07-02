const StringEditor = (props) => {
	return R.input({onChange: props.onChange, disabled:props.disabled, title:props.value, value: props.value || ''});
};

export default StringEditor;