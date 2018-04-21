var BooleanEditor = (props) => {
	return R.input({onChange: props.onChange, className: 'checkbox', type: 'checkbox', checked: props.value || false});
}

export default BooleanEditor