import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';
import BooleanEditor from './boolean-editor.js';


var typedEditors = new WeakMap();
typedEditors[Number] = {renderer: NumberEditor,     parser:parseFloat};
typedEditors[String] = {renderer: StringEditor,     parser:(val)=>{return val}};
typedEditors[Boolean] = {renderer: BooleanEditor,   parser:(val)=>{return val==='true' im here}};

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
        var val = getTypeEditor(this.props.field).parser(ev.target.value);
        this.props.onChange(this.props.field.name, val);
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