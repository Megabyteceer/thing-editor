import sp from "thing-editor/src/editor/utils/stop-propagation";
import game from "thing-editor/src/engine/game";

const copyTextByClick = (ev: PointerEvent) => {
	if(ev.ctrlKey) {
		game.editor.copyToClipboard((ev.target as any).ctrlclickcopyvalue ?
			(ev.target as any).ctrlclickcopyvalue as string : (ev.target as HTMLElement).innerText);
		sp(ev);
	}
};

export default copyTextByClick;