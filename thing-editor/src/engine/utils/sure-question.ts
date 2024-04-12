import type { Container, Text } from 'pixi.js';
import game from 'thing-editor/src/engine/game';
import type Button from 'thing-editor/src/engine/lib/assets/src/basic/button.c';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import L from 'thing-editor/src/engine/utils/l';

/** thing-editor internal */
const sureQuestionInit = (container: Container, title: string, message: string, yesLabel?: string, onYes?: (() => void) | string, noLabel?: string, onNo?: (() => void) | string, easyClose = true) => {

	const onYesHandler = () => {
		game.hideModal(container);
		if (onYes) {
			if (typeof onYes === 'string') {
				callByPath(onYes, container);
			} else {
				onYes();
			}
		}
	};
	const onNoHandler = () => {
		game.hideModal(container);
		if (onNo) {
			if (typeof onNo === 'string') {
				callByPath(onNo, container);
			} else {
				onNo();
			}
		}
	};

	let btn = container.findChildByName('easyCloseBtn') as Button;
	if (btn) {
		if (!easyClose) {
			btn.disable();
		} else {
			btn.onClickCallback = onNoHandler;
		}
	}

	if ((typeof title) === 'string') {
		let tf = container.findChildByName('title') as Text;
		if (tf) {
			tf.text = title;
		}
	}
	if ((typeof message) === 'string') {
		let tf = container.findChildByName('message') as Text;
		if (tf) {
			tf.text = message;
		}
	}

	let okBtn = container.findChildByName('okBtn') as Button;
	if (okBtn) {
		if (yesLabel) {
			let tf = okBtn.findChildByName('label') as Text;
			if (tf) {
				if (L.has(yesLabel)) {
					tf.translatableText = yesLabel;
				} else {
					tf.translatableText = null;
					tf.text = yesLabel;
				}
			}
		}
		okBtn.onClickCallback = onYesHandler;
	}

	let noBtn = container.findChildByName('noBtn') as Button;
	if (noBtn) {
		if (noLabel) {
			let tf = noBtn.findChildByName('label') as Text;
			if (tf) {
				if (L.has(noLabel)) {
					tf.translatableText = noLabel;
				} else {
					tf.translatableText = null;
					tf.text = noLabel;
				}
			}
		}

		if (noLabel || (onNo && !easyClose)) {
			noBtn.onClickCallback = onNoHandler;
		} else {
			noBtn.visible = false;
			okBtn.x = (okBtn.x + noBtn.x) / 2; //Centralize ok button
		}
	}
};

export default sureQuestionInit;
