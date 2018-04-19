import PropsFieldWrapper from './props-field-wrapper.js';
var propsStore = {};
var draggingProps;
var draggingInput;
var lastY;

let onChange = (ev) => {
    var props = propsStore[ev.target.dataset.fieldname];
    var val = parseFloat(ev.target.value) || 0;
    props.onChange(PropsFieldWrapper.surrogateChnageEvent(val));
}

let onDoubleClick = (ev) => {
    ev.target.select();
}

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
        var e = PropsFieldWrapper.surrogateChnageEvent(parseFloat(draggingInput.value) + d * (draggingProps.field.step || 1));
        draggingProps.onChange(e);
    }
})


var NumberEditor = (props) => {
    propsStore[props.field.name] = props;
    var step = props.field.step || 1;
    var val = Math.round(props.value / step) * step;
    return R.input({onChange:onChange, value: val, 'data-fieldname':props.field.name, onDoubleClick:onDoubleClick, onMouseDown:onMouseDown, type:'number', lang:"en-150", step:props.field.step, min:props.field.min, max:props.field.max});
}

export default NumberEditor