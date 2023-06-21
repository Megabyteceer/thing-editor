import { KeyedObject, SelectableProperty } from "thing-editor/src/editor/env.js";
import { addOnClickOnce } from "thing-editor/src/engine/utils/game-interaction.js";
import game from "../game.js";

const docElement = document.documentElement;

export default class FullScreen {

	static isAvailable = (docElement.requestFullscreen as any as boolean) && !(window as KeyedObject).cordova;

	static get isFullscreen() {
		if(document.fullscreenElement)
			return true;
		return false;
	}

	static open() {
		addOnClickOnce(FullScreen._openInner);
	}

	static _openInner() {
		try {
			if(docElement.requestFullscreen) {
				docElement.requestFullscreen();
			}
			game._fireNextOnResizeImmediately();

		} catch(err) { } // eslint-disable-line no-empty
	}

	static toggle() {
		if(FullScreen.isFullscreen) {
			FullScreen.close();
		} else {
			FullScreen.open();
		}
	}

	static close() {
		addOnClickOnce(FullScreen._closeInner);
		/// #if EDITOR
		/*
		/// #endif
		game.projectDesc.autoFullscreenMobile = game.projectDesc.autoFullscreenDesktop = false;
		//*/
	}

	static _closeInner() {
		game._fireNextOnResizeImmediately();
		if(document.exitFullscreen) {
			document.exitFullscreen();
		}
	}

}


/// #if EDITOR


(FullScreen as SelectableProperty).___EDITOR_isGoodForChooser = true;
(FullScreen.open as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(FullScreen.close as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(FullScreen.toggle as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

const ButtonOnlyPropertyDesc = {
	get: () => {
		return !game.editor.currentPathChoosingField || game.editor.currentPathChoosingField.name.toLocaleLowerCase().indexOf('click') < 0; // TODO check if button can choose it
	}
}

Object.defineProperty(FullScreen.toggle, '___EDITOR_isHiddenForChooser', ButtonOnlyPropertyDesc);
Object.defineProperty(FullScreen.open, '___EDITOR_isHiddenForChooser', ButtonOnlyPropertyDesc);
Object.defineProperty(FullScreen.close, '___EDITOR_isHiddenForChooser', ButtonOnlyPropertyDesc);

/// #endif