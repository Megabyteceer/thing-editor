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
	if(hotkey.altKey) {
		return false;
	}
	const isCtrlRequired = hotkeysBlockedWhenInputFocused[hotkey.key];
	if(isCtrlRequired === undefined) {
		return false;
	}
	if(isCtrlRequired === true) {
		return true;
	}
	return isCtrlRequired === (hotkey.ctrlKey || null);
}

const isHotkeyHit = (ev: Hotkey, element: HTMLElement, hotkey?: Hotkey) => {

	if(!hotkey) {
		return;
	}

	if(
		((hotkey.ctrlKey && hotkey.key === 'c') && (window.getSelection() || '').toString()) ||
		(isEventFocusOnInputElement(ev as any as PointerEvent) && (isHotkeyBlockedOnInput(hotkey))) ||
		((hotkey.key !== 'F1') && game.editor.ui.modal.isUIBlockedByModal(element)) // F1 - help hotkey works always
	) {
		return;
	}

	if((ev.key.toLocaleLowerCase() === hotkey.key.toLocaleLowerCase()) &&
		((ev.ctrlKey || false) === (hotkey.ctrlKey === true)) &&
		((ev.altKey || false) === (hotkey.altKey === true)) &&
		((ev.shiftKey || false) === (hotkey.shiftKey === true))
	) {
		return true;
	}
}

export default isHotkeyHit;

export type { Hotkey };
