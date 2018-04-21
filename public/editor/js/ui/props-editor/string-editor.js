var StringEditor = (props) => {
	return R.input({onChange: props.onChange, value: props.value || ''});
}

export default StringEditor