import { ClassAttributes, Component, ComponentChild, h } from "preact";
import fs from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics.js";
import ChooseList from "thing-editor/src/editor/ui/choose-list";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import Help from "thing-editor/src/editor/ui/help";
import Prompt from "thing-editor/src/editor/ui/modal/prompt";
import assert from "thing-editor/src/engine/debug/assert.js";
import game from "thing-editor/src/engine/game";

let modal: Modal;

interface ModalEntry {
	content: ComponentChild
	title: ComponentChild
	noEasyClose: boolean
	resolve: (res: unknown) => void
}

let blackoutProps = { className: 'modal-blackout fadein-animation' };
let blackoutPropsClosable = {
	className: 'modal-blackout fadein-animation', style: { cursor: 'pointer' }, onMouseDown: (ev: PointerEvent) => {
		if((ev.target as HTMLElement).className.indexOf('modal-blackout') === 0) {
			modal.hideModal();
		}
	}
};

let spinnerProps = { className: 'modal-spinner' };
let bodyProps = { className: 'modal-body' };
let titleProps = { className: 'modal-title' };
let contentProps = { className: 'modal-content' };
let errorProps = { className: 'error' };
let notifyProps = { className: 'modal-notification' };
let notifyPropsDuringSpinner = { className: 'modal-notification modal-notification-centred' };

let notifyText: string | Component | null;
let notifyInterval: number | null;

let spinnerShowCounter = 0;

let renderModal = (props: ModalEntry, i: number) => {
	let title;

	if(props.title) {
		title = R.div(titleProps, props.title);
	}

	return R.div({ key: i },
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

let renderSpinner = () => {
	return R.div(blackoutProps,
		R.div(spinnerProps)
	);
};

interface ModalProps extends ClassAttributes<Modal> {

}

interface ModalState {
	modals: ModalEntry[]
}

class Modal extends ComponentDebounced<ModalProps, ModalState> {

	constructor() {
		super();
		this.state = {
			modals: []
		};
	}

	isUIBlockedByModal(element: HTMLElement) {
		if(spinnerShowCounter > 0) {
			return true;
		}

		if(this.state.modals.length > 0) {
			const topModals = document.querySelectorAll('.modal-body');
			const topModal = topModals[topModals.length - 1];
			return !topModal.contains(element) && !element.classList.contains('modal-close-button');
		}
		return false;
	}

	hideModal(val?: any) {
		assert(modal.state.modals.length > 0, 'tried to close modal dialogue, but no one opened.');
		let closedModalItem = modal.state.modals.pop()!;
		modal.refresh();
		closedModalItem.resolve(val);
	}

	showModal(content: ComponentChild, title: ComponentChild, noEasyClose = false, toBottom = false): Promise<any> {
		if(document.activeElement) {
			(document.activeElement as HTMLElement).blur();
		}
		return new Promise((resolve) => {
			modal.state.modals[toBottom ? 'unshift' : 'push']({ content, title, noEasyClose, resolve });
			modal.refresh();
		});
	}

	showInfo(message: ComponentChild, title: ComponentChild, errorCode = 99999) {
		this.showModal(message, errorCode ?
			R.span(null, R.icon('info'), errorCode, ' ', title, R.btn('?', () => {
				Help.openErrorCodeHelp(errorCode);
			}, 'Open docs for this message (F1)', 'error-help-button', 112))
			: title
		);
	}

	showPrompt(title: ComponentChild, defaultText?: string, filter?: (val: string) => string, accept?: (val: string) => string | undefined, noEasyClose?: boolean, multiline?: boolean) {
		return this.showModal(h(Prompt, { defaultText, filter, accept, multiline }), title, noEasyClose);
	}

	showListChoose(title: string, list: any[], noEasyClose?: boolean, noSearchField: boolean = false) {
		return this.showModal(h(ChooseList, { list, noSearchField }), title, noEasyClose);
	}

	notify(txt: string | Component) {
		notifyText = txt;
		if(notifyInterval) {
			clearInterval(notifyInterval);
			notifyInterval = null;
		}
		if(txt) {
			notifyInterval = setInterval(() => {
				notifyText = null;
				this.refresh();
			}, 1000);
		}
		this.refresh();
	}

	componentDidMount() {
		assert(!modal, 'Modal already mounted.');
		modal = this;
	}

	showSpinner() {
		spinnerShowCounter++;
		if(spinnerShowCounter === 1) {
			if(game.stage) {
				game.stage.interactiveChildren = false;
			}
			modal.refresh();
		}
	}

	hideSpinner() {
		spinnerShowCounter--;
		if(spinnerShowCounter === 0) {
			setTimeout(() => {
				if(game.stage) {
					game.stage.interactiveChildren = true;
				}
				modal.refresh();
			}, 10);
		}
	}

	showEditorQuestion(title: ComponentChild, message: ComponentChild, onYes: () => void, yesLabel = 'Ok', onNo?: () => void, noLabel = 'Cancel', noEasyClose = false) {

		let yesBtn = R.btn(yesLabel, () => {
			modal.hideModal(true);
			if(onYes) {
				onYes();
			}
		}, undefined, 'main-btn', 13);

		let noBtn;
		if(typeof onNo !== 'undefined') {
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

	/*showPrompt(title: ComponentChild, defaultText:string, filter, accept, noEasyClose, multiline) {
		//return this.showModal(React.createElement(Prompt, { defaultText, filter, accept, multiline }), title, noEasyClose);
		//TODO:
	}*/

	/*showListFilter(title: ComponentChild, list) {
		//return this.showModal(React.createElement(FilterList, { list }), title, true);
		//TODO:
	}*/

	/*	showListChoose(title: ComponentChild, list, noEasyClose, noSearchField) {
			//return this.showModal(h(ChooseList, { list, noSearchField }), title, noEasyClose); 
			//TODO:
		}*/

	showError(message: ComponentChild, errorCode = 99999, title = 'Error!', noEasyClose = false, toBottom = false): Promise<any> {

		if(game.editor.buildProjectAndExit) {
			if(typeof message === 'object') {
				try {
					let txt: string[] = [];
					JSON.stringify(message, (key, value) => {
						if(key !== 'type' && typeof value === 'string') {
							txt.push(value);
						}
						return value;
					});
					message = txt.join('\n');
				} catch(er) { } // eslint-disable-line no-empty
			}
			fs.exitWithResult(undefined, (game.editor.buildProjectAndExit ? ('Build failed: ' + game.editor.buildProjectAndExit.projectName + '\n') : '') + message + '; Error code: ' + errorCode);
			return Promise.resolve();
		} else {
			if(game.stage) {
				setTimeout(game.editor.ui.viewport.stopExecution, 0);
			}
			return this.showModal(R.div(errorProps, R.multilineText(message)), R.span(null, R.icon('error'), errorCode, ' ', title, R.btn('?', () => {
				Help.openErrorCodeHelp(errorCode);
			}, 'Open docs for this error (F1)', 'error-help-button', 112)), noEasyClose, toBottom);
		}
	}

	showFatalError(message: ComponentChild, errorCode: number, additionalText = 'FatalError. Please check console output (F12) for exceptions messages, and restart application (Reload page) by press (F5) button. If any unsaved changes in current scene, it will ask you to restore automatic created backup.') {
		game.editor.__FatalError = true;
		this.showError(R.div(null, R.div(null, R.b(null, message)), additionalText), errorCode, 'FatalError', true, true);
	}

	render(): ComponentChild {
		let spinner;
		if(spinnerShowCounter > 0) {
			spinner = renderSpinner();
		}

		let notify;
		if(notifyText) {
			notify = R.div(spinner ? notifyPropsDuringSpinner : notifyProps, notifyText);
		}

		let hotkeyButton;
		if(this.state.modals.length > 0) {
			hotkeyButton = R.btn('х', () => {
				let m = modal.state.modals[modal.state.modals.length - 1];
				if(m && !m.noEasyClose) {
					modal.hideModal();
				}
			}, undefined, "modal-close-button hidden", 27);
		}
		return R.fragment(this.state.modals.map(renderModal), spinner, notify, hotkeyButton);
	}
}

export default Modal;