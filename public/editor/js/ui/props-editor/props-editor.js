import PropsFieldWrapper from './props-field-wrapper.js';

var editorProps = {
    className:'props-editor'
}

var splitters = new Map();
var currentSplitter = 0;
var getSplitter = (field) => {
    var s = splitters[field];
    if(!s) {
        s = R.div({className:'props-splitter', key:'splitter-' + (currentSplitter++)});
        splitters[field] = s;
    }
    return s;
}

class PropsEditor extends React.Component {
    
    render() {
        if(EDITOR.selection.length <= 0) {
            return 'Nothing selected';
        }

        var props = EDITOR.selection[0].listEditableProps();
        var propsFilter = {};

        EDITOR.selection.some((o) => {
            var ps = o.listEditableProps();
            ps.some((p) => {
                var name =  p.name;
                propsFilter[name] = propsFilter.hasOwnProperty(name) ? (propsFilter[name] + 1) : 1;
            });
        })
        props = props.filter((p) => {
            return propsFilter[p.name] === EDITOR.selection.length;
        });


        return R.div(editorProps, props.map((p) => {
            if(p.type === 'splitter') {
                return getSplitter(p);
            }
            return React.createElement(PropsFieldWrapper, {key:p.name, field:p, onChange: this.props.onChange}); 
        }));
    }
    

}

export default PropsEditor;