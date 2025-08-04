import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

let __textCopiedFrom: HTMLDivElement | undefined;

const copyTextByClick = (ev: PointerEvent) => {
	if (ev.ctrlKey) {
		const target = ((ev.target as HTMLDivElement).closest('.selectable-text') || ev.target) as HTMLDivElement;

		const copyValue = (target.attributes as any).ctrlClickCopyValue;
		game.editor.copyToClipboard(typeof copyValue !== 'undefined' ?
			copyValue.value : (target).innerText);
		sp(ev);
		__textCopiedFrom = target;
	}
};

export default copyTextByClick;

window.addEventListener('mouseup', () => {
	setTimeout(() => {
		__textCopiedFrom = undefined;
	}, 10);
});

const isEventBlockedByTextCopy = (ev:PointerEvent) => {
	return ev.target === __textCopiedFrom;
};
export { isEventBlockedByTextCopy };

