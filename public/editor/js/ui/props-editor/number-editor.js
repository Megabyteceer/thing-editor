var propsStore = {};
var draggingProps;
var draggingInput;
var lastY;
var surrogateEvent = {target:{value:0}};

let onMouseDown = (ev) => {
    var props = propsStore[ev.target.dataset.fieldname];
    var val = ev.target.value;
    draggingInput = ev.target;
    draggingProps = props;
    lastY = ev.clientY;
}

$(window).on('mousemove', (ev) => {
    if(!ev.buttons) draggingProps = undefined;
    if(!draggingProps) return;
    
    var d = Math.round((lastY - ev.clientY) / 2.001);
    if(d !== 0) {
        lastY = ev.clientY;
        surrogateEvent.target.value = parseFloat(draggingInput.value) + d * (draggingProps.field.step || 1);
        draggingProps.onChange(surrogateEvent);
    }
})


var NumberEditor = (props) => {
    propsStore[props.field.name] = props;
    var step = props.field.step || 1;
    var val = Math.round(props.value / step) * step;
    return R.input({onChange:props.onChange, value: val, 'data-fieldname':props.field.name, onMouseDown:onMouseDown, type:'number', lang:"en-150", step:props.field.step, min:props.field.min, max:props.field.max});
}

export default NumberEditor