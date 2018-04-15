import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';
import BooleanEditor from './boolean-editor.js';


var typedEditors = new WeakMap();
typedEditors[Number] = {renderer: NumberEditor,     parser:(target)=>{return parseFloat(target.value)}};
typedEditors[String] = {renderer: StringEditor,     parser:(target)=>{return target.value}};
typedEditors[Boolean] = {renderer: BooleanEditor,   parser:(target)=>{return target.checked}};



var getTypeEditor = (field) =>{
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

        this.props.onChange(field.name, val);
        this.setState({value:val});
    }

    render () {
        var field = this.props.field;

        var value = EDITOR.selection[0][field.name];

        return R.div(fieldProps,
        R.div(labelProps, field.name+':'),
        R.div(wrapperProps,
            React.createElement(getTypeEditor(field).renderer, {
                value,
                onChange:this.onChange,
                field
            })
        ));
    }
}

export default PropsFieldWrapper