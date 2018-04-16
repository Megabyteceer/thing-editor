var modal;

var blackoutProps = {className:'modal-blackout'};
var blackoutPropsClosable = {className:'modal-blackout', style:{cursor:'pointer'}, onClick:() => {modal.close()}};
var bodyProps = {className:'modal-body', onClick:sp};
var titleProps = {className:'modal-title'};
var contentProps = {className:'modal-content'};

var renderModal = (props, i) => {

    var title;

    if(props.title) {
        title = R.div(titleProps, props.title);
    }

    return R.div({key:i},
        R.div(props.noEasyClose ? blackoutProps : blackoutPropsClosable,
            R.div(bodyProps,
                title,
                R.div(contentProps,
                    props.content
                )
            )
        )
    );
}

class Modal extends React.Component {
    
    constructor(props) {
        super(props);
        this.state= {
            modals:[]
        };
    }

    close() {
        assert(this.state.modals.length > 0, 'tried to close modal dialogue, but no one opened.');
        this.state.modals.pop();
        this.forceUpdate();
    }

    open(content, title, noEasyClose) {
        this.state.modals.push({content, title, noEasyClose});
        this.forceUpdate();
    }

    componentDidMount() {
        assert(!modal, 'Modal already mounted.');
        modal = this;
    }

    render() {
        return R.div(null, this.state.modals.map(renderModal));
    }
}

export default Modal;