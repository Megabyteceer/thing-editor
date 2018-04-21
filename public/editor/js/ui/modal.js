var modal;

var blackoutProps = {className: 'modal-blackout fadein-animation'};
var blackoutPropsClosable = {
	className: 'modal-blackout fadein-animation', style: {cursor: 'pointer'}, onClick: (sp) => {
		if (sp.target.className.indexOf('modal-blackout') === 0) {
			modal.close();
		}
	}
};
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

var renderSpinner = () => {
	return R.div(blackoutProps,
		R.div(bodyProps,
			'Loading...'
		)
	);
}

class Modal extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {
			modals: []
		};
	}
	
	close() {
		assert(modal.state.modals.length > 0, 'tried to close modal dialogue, but no one opened.');
		modal.state.modals.pop();
		modal.forceUpdate();
	}
	
	open(content, title, noEasyClose) {
		modal.state.modals.push({content, title, noEasyClose});
		modal.forceUpdate();
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
	
	showError(message, title = 'Error!', noEasyClose) {
		this.open(R.div(errorProps, message), R.span(null, R.icon('error'), title), noEasyClose);
	}
	
	render() {
		if (spinnerShowCounter > 0) {
			return renderSpinner();
		}
		return R.div(null, this.state.modals.map(renderModal));
	}
}

export default Modal;