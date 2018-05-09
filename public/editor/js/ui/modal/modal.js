import Prompt from './prompt.js';
import ChooseList from './choose-list.js';

var modal;

var blackoutProps = {className: 'modal-blackout fadein-animation'};
var blackoutPropsClosable = {
	className: 'modal-blackout fadein-animation', style: {cursor: 'pointer'}, onClick: (sp) => {
		if (sp.target.className.indexOf('modal-blackout') === 0) {
			modal.closeModal();
		}
	}
};

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
		if (m && !m.noEasyClose) {
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
	
	showQuestion(title, message, onYes, yesLabel = 'Ok', onNo, noLabel = 'Cancel', noEasyClose) {
		
		var yesBtn = R.btn(yesLabel, () => {
			modal.closeModal(true);
			onYes();
		}, undefined, 'main-btn', 13);
		if (typeof onNo != 'undefined') {
			var noBtn = R.btn(noLabel, () => {
				modal.closeModal();
				onNo();
			});
		}
		
		return this.showModal(R.div(null, message,
			R.div(null,
				yesBtn,
				noBtn
			)
		), title, noEasyClose);
	}
	
	showPrompt(title, defaultText, filter, accept, noEasyClose) {
		return this.showModal(React.createElement(Prompt, {defaultText, filter, accept}), title, noEasyClose);
	}
	
	showListChoose(title, list, noEasyClose) {
		return this.showModal(React.createElement(ChooseList, {list}), title, noEasyClose);
	}
	
	showError(message, title = 'Error!', noEasyClose) {
		editor.ui.viewport.stopExecution();
		return this.showModal(R.div(errorProps, message), R.span(null, R.icon('error'), title), noEasyClose);
	}
	
	render() {
		var spinner;
		if (spinnerShowCounter > 0) {
			spinner = renderSpinner();
		}
		return R.fragment(this.state.modals.map(renderModal), spinner);
	}
}

export default Modal;