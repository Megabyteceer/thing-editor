import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';

const copyTextByClick = (ev: PointerEvent) => {
	if (ev.ctrlKey) {
		const copyValue = ((ev.target as HTMLDivElement).attributes as any).ctrlclickcopyvalue;
		game.editor.copyToClipboard(typeof copyValue !== 'undefined' ?
			copyValue.value : (ev.target as HTMLElement).innerText);
		sp(ev);
	}
};

export default copyTextByClick;
