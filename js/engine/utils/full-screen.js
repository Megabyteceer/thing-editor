import game from "../game.js";

var elem = document.documentElement;


export default class FullScreen {

	static get isFullscreen() {
		if (document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement)
			return true;
		return false;
	}

	static open() {
		game.addOnClickOnce(FullScreen._openInner);
	}

	static _openInner() {
		try {
			/// #if EDITOR
			elem = document.querySelector('#viewport-root');
			/// #endif
			let f = elem.requestFullscreen || elem.mozRequestFullScreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;
			if(f) {
				f.call(elem).then(() => {
					if(game.projectDesc.screenOrientation === 'portrait' || game.projectDesc.screenOrientation === 'landscape') {
						screen.orientation.lock(game.projectDesc.screenOrientation).catch(() => {});
					}
				});
			}
			game._fireNextOnResizeImmediately();
		} catch(err) {} // eslint-disable-line no-empty
	}

	static toggle() {
		if (FullScreen.isFullscreen) {
			FullScreen.close();
		} else {
			FullScreen.open();
		}
	}

	static close() {
		game.addOnClickOnce(FullScreen._closeInner);
		/// #if EDITOR
		/*
		/// #endif
		game.projectDesc.autoFullscreenMobile = game.projectDesc.autoFullscreenDesktop = false;
		//*/
	}

	static _closeInner() {
		game._fireNextOnResizeImmediately();
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if (document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if (document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		} else if (document.msExitFullscreen) {
			document.msExitFullscreen();
		}
	}
}

FullScreen.isAvailable = (elem.requestFullscreen ||
	elem.mozRequestFullScreen || 
	elem.webkitRequestFullscreen || 
	elem.msRequestFullscreen) && !window.cordova;


/// #if EDITOR
FullScreen.___EDITOR_isGoodForChooser = true;
FullScreen.open.___EDITOR_isGoodForCallbackChooser = true;
FullScreen.close.___EDITOR_isGoodForCallbackChooser = true;
FullScreen.toggle.___EDITOR_isGoodForCallbackChooser = true;
/// #endif