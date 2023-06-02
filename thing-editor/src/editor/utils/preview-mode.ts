
import { Container } from "pixi.js";
import { editorEvents } from "thing-editor/src/editor/utils/editor-events";

function __EDITOR_inner_exitPreviewMode(o: Container) {
	if(o.__nodeExtendData.component_in_previewMode) { //TODO  enter preview mode is lost?
		if(o.__exitPreviewMode) {
			editorEvents.off('beforePropertyChanged', o.__exitPreviewMode);
			o.__exitPreviewMode();
		}
		o.__nodeExtendData.component_in_previewMode = false;
	}
}


export { __EDITOR_inner_exitPreviewMode };
