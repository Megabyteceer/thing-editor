
import game from 'thing-editor/src/engine/game';
import { CTRL_READABLE } from 'thing-editor/src/engine/utils/utils';


interface Hotkey {
	key: string;
	ctrlKey?: true;
	altKey?: true;
	shiftKey?: true;
}

const isHotkeyHit = (ev: KeyboardEvent, element: HTMLElement, hotkey?: Hotkey) => {
	if (!hotkey) {
		return;
	}

	if ((((ev.ctrlKey || ev.metaKey) && (hotkey.key === 'c' || hotkey.key === 'v')) && (window.getSelection() || '').toString()) ||
		((hotkey.key !== 'F1' && hotkey.key !== 'F12') && game.editor.ui.modal.isUIBlockedByModal(element)) // F1, F12 - hotkey works always
	) {
		return;
	}

	const evCode = (ev.code === 'Backspace') ? 'Delete' : ev.code;

	if ((evCode.replace(/^Key/, '').toLocaleLowerCase() === hotkey.key.toLocaleLowerCase()) &&
		(((ev.ctrlKey || ev.metaKey) || false) === (hotkey.ctrlKey === true)) &&
		((ev.altKey || false) === (hotkey.altKey === true)) &&
		((ev.shiftKey || false) === (hotkey.shiftKey === true))
	) {
		return true;
	}
};


const hotkeyToString = (hotkey:Hotkey) :string => {
	let help = [];
	if (hotkey.ctrlKey) {
		help.push(CTRL_READABLE);
	}
	if (hotkey.altKey) {
		help.push('Alt');
	}
	if (hotkey.shiftKey) {
		help.push('Shift');
	}
	help.push('"' + ((hotkey.key.length > 1) ? hotkey.key : hotkey.key.toUpperCase()) + '"');
	return ' (' + help.join(' + ') + ')';
};


export default isHotkeyHit;
export { hotkeyToString };
export type { Hotkey };

