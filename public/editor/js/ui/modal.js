var modal;

var blackoutProps = {className: 'modal-blackout fadein-animation'};
var blackoutPropsClosable = {
	className: 'modal-blackout fadein-animation', style: {cursor: 'pointer'}, onClick: (sp) => {
		if (sp.target.className.indexOf('modal-blackout') === 0) {
			modal.closeModal();
		}
	}
};
var modalRejectProps = {className: 'modal-reject-text'};
var spinnerProps = {className: 'modal-spinner'};
var bodyProps = {className: 'modal-body'};
var titleProps = {className: 'modal-title'};
var contentProps = {className: 'modal-content'};
var errorProps = {className: 'error'};

var spinnerShowCounter = 0;

var renderModal = (props, i) => {
	var title;
	
	if (props.title) {
		title = R.div(titleProps, props.title);
	}
	
	return R.div({key: i},
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

$(window).on('keydown', (ev) => {
    if (ev.keyCode === 27) {
        var m = modal.state.modals[modal.state.modals.length - 1];
        if(m && !m.noEasyClose) {
            modal.closeModal();
            sp(ev);
        }
    }
});

var renderSpinner = () => {
	return R.div(blackoutProps,
		R.div(spinnerProps)
	);
}

class Prompt extends React.Component {
    constructor(props) {
        super(props);
        this.state = {value:props.defaultText || ''};
        this.onChange = this.onChange.bind(this);
        this.onAcceptClick = this.onAcceptClick.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
    }
    onChange(ev) {
        var val = this.props.filter ? this.props.filter(ev.target.value) : ev.target.value;
        var reject = this.props.accept ? this.props.accept(val) : undefined;
        this.setState({
            value:val,
            rejectReason: reject,
            accepted: val && !reject
        });
    }
    
    onKeyDown (ev){
        if(ev.keyCode === 13) {
            this.onAcceptClick();
        }
    }
    
    onAcceptClick() {
        if(this.state.accepted) {
            modal.closeModal(this.state.value);
        }
    }
    
    render() {
        return R.div(null,
            R.div(modalRejectProps, this.state.rejectReason || ' '),
            R.div(null,
                R.input({value:this.state.value, onKeyDown:this.onKeyDown, autoFocus:true, onChange:this.onChange})
            ),
            R.btn('Ok', this.onAcceptClick, this.props.title, 'main-btn', 13)
        )
    }
    
}


class Modal extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {
			modals: []
		};
	}
    
    closeModal(val) {
		assert(modal.state.modals.length > 0, 'tried to close modal dialogue, but no one opened.');
		var closedModalItem = modal.state.modals.pop();
		modal.forceUpdate();
        closedModalItem.resolve(val);
	}
    
    showModal(content, title, noEasyClose) {
	    return new Promise((resolve) => {
            modal.state.modals.push({content, title, noEasyClose, resolve});
            modal.forceUpdate();
        });
	}
	
	componentDidMount() {
		assert(!modal, 'Modal already mounted.');
		modal = this;
	}
	
	showSpinner() {
		spinnerShowCounter++;
		if (spinnerShowCounter === 1) {
			modal.forceUpdate();
		}
	}
	
	hideSpinner() {
		spinnerShowCounter--;
		if (spinnerShowCounter === 0) {
			setTimeout(() => {
				modal.forceUpdate();
			}, 10);
		}
	}
    
    promptShow(title, defaultText, filter, accept, noEasyClose) {
	    return this.showModal(React.createElement(Prompt, {defaultText, filter, accept}), title, noEasyClose);
    }
	
	showError(message, title = 'Error!', noEasyClose) {
		return this.showModal(R.div(errorProps, message), R.span(null, R.icon('error'), title), noEasyClose);
	}
	
	render() {
	    var spinner;
		if (spinnerShowCounter > 0) {
            spinner = renderSpinner();
		}
		return R.div(null, this.state.modals.map(renderModal), spinner);
	}
}

export default Modal;