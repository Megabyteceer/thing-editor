import { ClassAttributes, Component, ComponentChild, h } from "preact";
import fs from "thing-editor/src/editor/fs";
import R from "thing-editor/src/editor/preact-fabrics.js";
import ChooseList from "thing-editor/src/editor/ui/choose-list";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import Help from "thing-editor/src/editor/ui/help";
import Prompt from "thing-editor/src/editor/ui/modal/prompt";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags";
import assert from "thing-editor/src/engine/debug/assert.js";
import game from "thing-editor/src/engine/game";

let modal: Modal;

interface ModalEntry {
	content: ComponentChild
	title: ComponentChild
	noEasyClose: boolean
	resolve: (res: unknown) => void
}

const questionFooterProps = { className: 'modal-footer' };

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
let contentProps = {
	className: 'modal-content',
	ref: (content: HTMLDivElement | null) => {
		if(content) {
			const searchInput = (content as HTMLDivElement).querySelectorAll('input')[0] as HTMLInputElement;

			if(searchInput) {
				setTimeout(() => {
					searchInput.select();
				}, 10);
			}
		}
	}
};
let errorProps = { className: 'error' };
let notifyProps = { className: 'modal-notification' };
let notifyWrapperProps = { className: 'modal-notification-wrapper', style: { left: '0px', top: '0px' } };
let notifyPropsDuringSpinner = { className: 'modal-notification modal-notification-centred' };

let notifyTexts: Set<string | Component> = new Set();

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

	isUIBlockedByModal(element?: HTMLElement) {
		if(!element) {
			return false;
		}
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
		setTimeout(() => {
			closedModalItem.resolve(val);
		}, 1);
	}

	showModal(content: ComponentChild, title: ComponentChild = '', noEasyClose = false, toBottom = false): Promise<any> {
		game.editor.blurInputs();
		return new Promise((resolve) => {
			modal.state.modals[toBottom ? 'unshift' : 'push']({ content, title, noEasyClose, resolve });
			modal.refresh();
		});
	}

	showInfo(message: ComponentChild, title: ComponentChild, errorCode = 99999) {
		this.showModal(message, errorCode ?
			R.span(null, R.icon('info'), errorCode, ' ', title, R.btn('?', () => {
				Help.openErrorCodeHelp(errorCode);
			}, 'Open description for this message (F1)', 'error-help-button', { key: 'F1' }))
			: title
		);
	}

	showPrompt(title: ComponentChild, defaultText?: string, filter?: (val: string) => string, accept?: (val: string) => string | undefined, noEasyClose?: boolean, multiline?: boolean) {
		return this.showModal(h(Prompt, { defaultText, filter, accept, multiline }), title, noEasyClose);
	}

	showListChoose(title: ComponentChild, list: any[], noEasyClose?: boolean, noSearchField: boolean = false, activeValue?: string) {
		return this.showModal(h(ChooseList, { list, noSearchField, activeValue }), title, noEasyClose);
	}

	notify(txt: string | Component) {
		if(EDITOR_FLAGS.isTryTime) {
			return Promise.resolve();
		}
		notifyTexts.add(txt);

		setTimeout(() => {
			notifyTexts.delete(txt);
			this.refresh();
		}, 1000);
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

	showEditorQuestion(title: ComponentChild, message: ComponentChild, onYes: () => void, yesLabel: ComponentChild = 'Ok', onNo?: () => void, noLabel: ComponentChild = 'Cancel', noEasyClose = false) {

		let yesBtn = R.btn(yesLabel, () => {
			modal.hideModal(true);
			if(onYes) {
				onYes();
			}
		}, undefined, 'main-btn', { key: 'Enter' });

		let noBtn;
		if(typeof onNo !== 'undefined') {
			noBtn = R.btn(noLabel, () => {
				modal.hideModal();
				onNo();
			});
		}

		return this.showModal(R.div(null, message,
			R.div(questionFooterProps,
				yesBtn,
				noBtn
			)
		), title, noEasyClose);
	}

	showError(message: ComponentChild, errorCode = 99999, title = 'Error!', noEasyClose = false, toBottom = false): Promise<any> {
		if(EDITOR_FLAGS.isTryTime) {
			return Promise.resolve();
		}
		debugger;
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
			}, 'Open description for this error (F1)', 'error-help-button', { key: 'F1' })), noEasyClose, toBottom);
		}
	}

	showFatalError(message: ComponentChild, errorCode: number, additionalText = 'FatalError. Please check console output (F12) for exceptions messages, and restart application (Reload page) by press (F5) button. If any unsaved changes in current scene, it will ask you to restore automatic created backup.') {
		if(EDITOR_FLAGS.isTryTime) {
			return Promise.resolve();
		}
		game.editor.__FatalError = true;
		this.showError(R.div(null, R.div(null, R.b(null, message)), additionalText), errorCode, 'FatalError', true, true);
	}

	render(): ComponentChild {
		let spinner: ComponentChild;
		if(spinnerShowCounter > 0) {
			spinner = renderSpinner();
		}

		let notify: ComponentChild;
		let notifies: ComponentChild[] = [];
		notifyWrapperProps.style.left = game.editor.mouseX + "px";
		notifyWrapperProps.style.top = (game.editor.mouseY) + "px";
		notifyTexts.forEach((notifyText) => {
			notifies.push(R.div(notifyProps, notifyText));
		});
		if(notifies.length > 0) {
			notify = R.div(spinner ? notifyPropsDuringSpinner : notifyWrapperProps, notifies);
		}

		let hotkeyButton;
		if(this.state.modals.length > 0) {
			hotkeyButton = R.btn('х', () => {
				let m = modal.state.modals[modal.state.modals.length - 1];
				if(m && !m.noEasyClose) {
					modal.hideModal();
				}
			}, undefined, "modal-close-button hidden", { key: 'Escape' });
		}
		return R.fragment(spinner, this.state.modals.map(renderModal), notify, hotkeyButton);
	}
}

export default Modal;