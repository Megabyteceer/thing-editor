import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';
import BooleanEditor from './boolean-editor.js';
import SelectEditor from './select-editor.js';


var typedEditors = new WeakMap();
typedEditors[Number] = {renderer: NumberEditor,     parser:(target)=>{return parseFloat(target.value)}};
typedEditors[String] = {renderer: StringEditor,     parser:(target)=>{return target.value}};
typedEditors[Boolean] = {renderer: BooleanEditor,   parser:(target)=>{return target.checked}};



var getTypeEditor = (field) => {
    return typedEditors[field.type || Number];
}

var fieldProps = {className:'props-field'};

var labelProps = {className: 'props-label'};
var wrapperProps = {className: 'props-wrapper'};

class PropsFieldWrapper extends React.Component {


    constructor(props) {
        super(props);
        this.state = {};
        this.onChange = this.onChange.bind(this);
        if(props.field.hasOwnProperty('get')){
            this.getter = props.field.get;
        } else {
            this.getter = false;
        }
    }

    onChange (ev) {
        var field = this.props.field;
        var val = getTypeEditor(field).parser(ev.target);

        if(field.hasOwnProperty('min')) {
            val = Math.max(field.min, val);
        }
        if(field.hasOwnProperty('max')) {
            val = Math.min(field.max, val);
        }

        this.props.onChange(field, val);
        this.setState({value:val});
    }

    render () {
        var field = this.props.field;
        var value;
        if (this.getter) {
            value = this.getter(EDITOR.selection[0]);
        } else {
            value = EDITOR.selection[0][field.name];
        }
        
        var renderer;
        if(field.hasOwnProperty('select')) {
            renderer = SelectEditor;
        } else {
            renderer = getTypeEditor(field).renderer;
        }

        return R.div(fieldProps,
        R.div(labelProps, field.name+':'),
        R.div(wrapperProps,
            React.createElement(renderer, {
                value,
                onChange:this.onChange,
                field
            })
        ));
    }
}

var _surrogateEventObj = {target:{value:0}};
PropsFieldWrapper.surrogateChnageEvent = (val) => {
    _surrogateEventObj.target.value = val;
    return _surrogateEventObj;
};

export default PropsFieldWrapper