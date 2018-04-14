var propsStore = {};

let onMouseDown = (ev) => {
    var props = propsStore[ev.target.dataset.fieldname];
    var val = ev.target.value;
}


var NumberEditor = (props) => {
    propsStore[props.field.name] = props;
    var step = props.field.step || 1;
    var val = Math.round(props.value / step) * step;
    return R.input({onChange:props.onChange, value: val, 'data-fieldname':props.field.name, onMouseDown:onMouseDown, type:'number', lang:"en-150", step:props.field.step, min:props.field.min, max:props.field.max});
}

export default NumberEditor