let StringEditor = (props) => {
	return R.input({onChange: props.onChange, disabled:props.disabled, value: props.value || ''});
}

export default StringEditor