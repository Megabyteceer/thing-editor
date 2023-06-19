import { KeyedObject } from "thing-editor/src/editor/env";
import isEventFocusOnInputElement from "thing-editor/src/editor/utils/is-event-focus-on-input-element";
import game from "thing-editor/src/engine/game";

interface Hotkey {
	key: string;
	ctrlKey?: true;
	altKey?: true;
	shiftKey?: true;
}


const hotkeysBlockedWhenInputFocused: KeyedObject = {
	'Backspace': null,
	'Enter': null,
	'ArrowLeft': null,
	'ArrowRight': null,
	'ArrowUp': null,
	'ArrowDown': null,
	'Delete': null,
	',': null,
	'.': null,
	'z': true,
	'x': true,
	'c': true,
	'v': true,
};

function isHotkeyBlockedOnInput(hotkey: Hotkey) {
	const isCtrlRequired = hotkeysBlockedWhenInputFocused[hotkey.key];
	if(isCtrlRequired === undefined) {
		return false;
	}
	if(isCtrlRequired === null) {
		return true;
	}
	return isCtrlRequired === hotkey.ctrlKey;
}

const isHotkeyHit = (ev: KeyboardEvent, element: HTMLElement, hotkey?: Hotkey) => {

	if(!hotkey) {
		return;
	}

	if(
		((hotkey.ctrlKey && hotkey.key === 'c') && (window.getSelection() || '').toString()) ||
		(isEventFocusOnInputElement(ev) && (isHotkeyBlockedOnInput(hotkey))) ||
		((hotkey.key !== 'F1') && game.editor.ui.modal.isUIBlockedByModal(element)) // F1 - help hotkey works always
	) {
		return;
	}

	if((ev.key.toLocaleLowerCase() === hotkey.key.toLocaleLowerCase()) &&
		(ev.ctrlKey === (hotkey.ctrlKey === true)) &&
		(ev.altKey === (hotkey.altKey === true)) &&
		(ev.shiftKey === (hotkey.shiftKey === true))
	) {
		return true;
	}
}

export default isHotkeyHit;

export type { Hotkey };
