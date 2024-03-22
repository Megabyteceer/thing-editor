import { ButtonOnlyPropertyDesc } from 'thing-editor/src/editor/utils/button-only-selectable-property';
import { addOnClickOnce } from 'thing-editor/src/engine/utils/game-interaction.js';
import game from '../game.js';

const docElement = document.documentElement;

export default class FullScreen {

	static isAvailable = (docElement.requestFullscreen as any as boolean) && !(window as KeyedObject).cordova;

	static get isFullscreen() {
		if (document.fullscreenElement)
			return true;
		return false;
	}

	static open() {
		addOnClickOnce(FullScreen._openInner);
	}

	static _openInner() {
		try {
			if (docElement.requestFullscreen) {
				docElement.requestFullscreen().finally(() => {
					if (game.projectDesc.screenOrientation !== 'auto') {
						(screen.orientation as any).lock(game.projectDesc.screenOrientation);
					}
				});
			}
			game._fireNextOnResizeImmediately();
			if (game.projectDesc.screenOrientation !== 'auto') {
				(screen.orientation as any).lock(game.projectDesc.screenOrientation);
			}
		} catch (_err) { }
	}

	static toggle() {
		if (FullScreen.isFullscreen) {
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
		game.projectDesc.autoFullScreenMobile = game.projectDesc.autoFullScreenDesktop = false;
		//*/
	}

	static _closeInner() {
		game._fireNextOnResizeImmediately();
		if (document.exitFullscreen) {
			document.exitFullscreen();
		}
	}

}


/// #if EDITOR


(FullScreen as SelectableProperty).___EDITOR_isGoodForChooser = true;
(FullScreen.open as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(FullScreen.close as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(FullScreen.toggle as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

Object.defineProperty(FullScreen, '___EDITOR_isHiddenForChooser', ButtonOnlyPropertyDesc);

/// #endif
