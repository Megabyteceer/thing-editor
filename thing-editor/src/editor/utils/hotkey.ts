
import game from 'thing-editor/src/engine/game';

interface Hotkey {
	key: string;
	ctrlKey?: true;
	altKey?: true;
	shiftKey?: true;
}

const isHotkeyHit = (ev: KeyboardEvent | Hotkey, element: HTMLElement, hotkey?: Hotkey) => {
	if (!hotkey) {
		return;
	}

	if (((hotkey.ctrlKey && (hotkey.key === 'c' || hotkey.key === 'v')) && (window.getSelection() || '').toString()) ||
		((hotkey.key !== 'F1') && game.editor.ui.modal.isUIBlockedByModal(element)) // F1 - help hotkey works always
	) {
		return;
	}

	if (((ev instanceof KeyboardEvent ? ev.code.replace(/^Key/, '').toLocaleLowerCase() : ev.key.toLocaleLowerCase()) === hotkey.key.toLocaleLowerCase()) &&
		((ev.ctrlKey || false) === (hotkey.ctrlKey === true)) &&
		((ev.altKey || false) === (hotkey.altKey === true)) &&
		((ev.shiftKey || false) === (hotkey.shiftKey === true))
	) {
		return true;
	}
};


const hotkeyToString = (hotkey:Hotkey) :string => {
	let help = [];
	if (hotkey.ctrlKey) {
		help.push('Ctrl');
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

