var BooleanEditor = (props) => {
    return R.input({onChange:props.onChange, className:'checkbox', type:'checkbox', value: props.value || false});
}

export default BooleanEditor