class ClessesView extends React.Component {

    constructor(props){
        super(props);
        EDITOR.ClassesLoader.loaded.add(this.onClassesLoaded.bind(this));
        this.state = {};
        this.renderItem = this.renderItem.bind(this);
    }

    onClassesLoaded() {
        this.forceUpdate();
    }
    
    onSelect(item) {

    }

    renderItem(item) {
        return R.listItem(R.span(null,  R.classIcon(item.c), item.c.name), item, item.id, this);
    }

    render() {
        if(!Lib.EDITORclasses) {
            return 'Loading...'
        };

        var list = Lib.EDITORclasses.map(this.renderItem);

        return R.div(null, list);
    }
}

export default ClessesView;