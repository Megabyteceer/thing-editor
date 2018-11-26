import Prompt from './prompt.js';
import ChooseList from './choose-list.js';
import game from "thing-engine/js/game.js";

let modal;

let blackoutProps = {className: 'modal-blackout fadein-animation'};
let blackoutPropsClosable = {
	className: 'modal-blackout fadein-animation', style: {cursor: 'pointer'}, onClick: (sp) => {
		if (sp.target.className.indexOf('modal-blackout') === 0) {
			modal.hideModal();
		}
	}
};

let spinnerProps = {className: 'modal-spinner'};
let bodyProps = {className: 'modal-body'};
let titleProps = {className: 'modal-title'};
let contentProps = {className: 'modal-content'};
let errorProps = {className: 'error'};
let notifyProps = {className: 'modal-notification'};

let notifyText;
let notifyInterval;

let spinnerShowCounter = 0;

let renderModal = (props, i) => {
	let title;
	
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
};

$(window).on('keydown', (ev) => {
	if (ev.keyCode === 27) {
		let m = modal.state.modals[modal.state.modals.length - 1];
		if (m && !m.noEasyClose) {
			modal.hideModal();
			sp(ev);
		}
	}
});

let renderSpinner = () => {
	return R.div(blackoutProps,
		R.div(spinnerProps)
	);
};

class Modal extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {
			modals: []
		};
	}

	isUIBlockedByModal(element) {
		if(spinnerShowCounter > 0) {
			return true;
		}
		if(this.state.modals.length > 0) {
			let topModal = $('.modal-body').last();
			return !$.contains(topModal[0], element);
		}
		return false;
	}
	
	hideModal(val) {
		assert(modal.state.modals.length > 0, 'tried to close modal dialogue, but no one opened.');
		let closedModalItem = modal.state.modals.pop();
		modal.forceUpdate();
		closedModalItem.resolve(val);
	}
	
	showModal(content, title, noEasyClose) {
		return new Promise((resolve) => {
			modal.state.modals.push({content, title, noEasyClose, resolve});
			modal.forceUpdate();
		});
	}

	notify(txt) {
		notifyText = txt;
		if(notifyInterval) {
			clearInterval(notifyInterval);
			notifyInterval = false;
		}
		if(txt) {
			notifyInterval = setInterval(() => {
				this.notify();
			}, 1000);
		}
		this.forceUpdate();
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
		
		let yesBtn = R.btn(yesLabel, () => {
			modal.hideModal(true);
			if(onYes) {
				onYes();
			}
		}, undefined, 'main-btn', 13);
		
		let noBtn;
		if (typeof onNo !== 'undefined') {
			noBtn = R.btn(noLabel, () => {
				modal.hideModal();
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
	
	showPrompt(title, defaultText, filter, accept, noEasyClose, multiline) {
		return this.showModal(React.createElement(Prompt, {defaultText, filter, accept, multiline}), title, noEasyClose);
	}
	
	showListChoose(title, list, noEasyClose) {
		return this.showModal(React.createElement(ChooseList, {list}), title, noEasyClose);
	}
	
	showError(message, title = 'Error!', noEasyClose) {
		if(game.stage) {
			setTimeout(editor.ui.viewport.stopExecution, 0);
		}
		return this.showModal(R.div(errorProps, R.multilineText(message)), R.span(null, R.icon('error'), title), noEasyClose);
	}
	
	showFatalError(message, additionalText = 'FatalError. Please check console output (F12) for exceptions messages, and restart application (Reload page) by press (F5) button. If any unsaved changes in current scene, it will ask you to restore automatic created backup.') {
		game.__paused = true;
		editor.__FatalError = true;
		this.showError(R.div(null, R.div(null, R.b(null, message)), additionalText), 'FatalError', true);
	}
	
	render() {
		let spinner;
		if (spinnerShowCounter > 0) {
			spinner = renderSpinner();
		}

		let notify;
		if(notifyText) {
			notify = R.div(notifyProps, notifyText);
		}
		return R.fragment(this.state.modals.map(renderModal), spinner, notify);
	}
}

export default Modal;