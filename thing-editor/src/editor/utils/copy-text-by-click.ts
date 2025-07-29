import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const copyTextByClick = (ev: PointerEvent) => {
	if (ev.ctrlKey) {
		const target = ((ev.target as HTMLDivElement).closest('.selectable-text') || ev.target) as HTMLDivElement;

		const copyValue = (target.attributes as any).ctrlClickCopyValue;
		game.editor.copyToClipboard(typeof copyValue !== 'undefined' ?
			copyValue.value : (target).innerText);
		sp(ev);
	}
};

export default copyTextByClick;
