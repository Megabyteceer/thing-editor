import NumberEditor from './number-editor.js';
import StringEditor from './string-editor.js';

var typedEditors = new WeakMap();
typedEditors[Number] = NumberEditor;
typedEditors[String] = StringEditor;

var fieldProps = {className:'props-field'};
var labelProps = {className: 'props-label'};
var wrapperProps = {className: 'props-wrapper'};

class PropsFieldWrapper extends React.Component {

    constructor(props) {
        super(props);
        this.onChange = this.onChange.bind(this);
    }

    onChange(ev) {
        this.props.onChange(this.props.field, ev.target.value);
    }

    render () {
        var field = this.props.field;

        var value = EDITOR.selection[0][field.name];

        return R.div(fieldProps, R.div(labelProps, field.name), R.div(wrapperProps, React.createElement(typedEditors[field.type || Number], {parent:this, defaultValue:value, onChange:this.propsonChange})));
    }
}

export default PropsFieldWrapper