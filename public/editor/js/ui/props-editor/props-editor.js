class PropsEditor extends React.Component {
    
    render() {
        return EDITOR.selection.map((o) => {
           return R.div({key:o.__editorData.id}, o.name); 
        });
    }
    

}

export default PropsEditor;