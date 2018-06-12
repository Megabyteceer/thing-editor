let ColorEditor = (props) => {
	let val = props.value || 0;
	
	return R.input({
		onChange: props.onChange,
		disabled:props.disabled,
		className: 'clickable',
		type: 'color',
		defaultValue: '#' + val.toString(16).padStart(6, '0')
	});
};

export default ColorEditor