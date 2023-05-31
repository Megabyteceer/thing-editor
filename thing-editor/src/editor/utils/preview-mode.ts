
import { Container } from "pixi.js";
import game from "thing-editor/src/engine/game";

function __EDITOR_inner_exitPreviewMode(o: Container) {
	if(o.__nodeExtendData.component_in_previewMode) { //TODO  enter preview mode is lost?
		if(o.__exitPreviewMode) {
			game.editor.events.off('beforePropertyChanged', o.__exitPreviewMode);
			o.__exitPreviewMode();
		}
		o.__nodeExtendData.component_in_previewMode = false;
	}
}


export { __EDITOR_inner_exitPreviewMode };
