import sp from "thing-editor/src/editor/utils/stop-propagation";
import game from "thing-editor/src/engine/game";

const copyTextByClick = (ev: PointerEvent) => {
	if(ev.ctrlKey) {
		game.editor.copyToClipboard((ev.target as HTMLElement).hasAttribute('ctrlclickcopyvalue') ?
			(ev.target as HTMLElement).getAttribute('ctrlclickcopyvalue') as string : (ev.target as HTMLElement).innerText);
		sp(ev);
	}
};

export default copyTextByClick;