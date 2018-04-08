class PropsEditor extends React.Component {
    
    render() {
        return EDITOR.selection.map((o) => {
           return R.div(null, o.name); 
        });
    }
    

}

export default PropsEditor;