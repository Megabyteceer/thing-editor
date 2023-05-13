import { KeyedObject, SelectableProperty } from "thing-editor/src/editor/env.js";
import game from "../game.js";
import { addOnClickOnce } from "thing-editor/src/engine/utils/game-interaction.js";

var elem = document.documentElement;


export default class FullScreen {

	static isAvailable = (elem.requestFullscreen as any as boolean) && !(window as KeyedObject).cordova;

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
			if(elem.requestFullscreen) {
				elem.requestFullscreen();
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
/// #endif