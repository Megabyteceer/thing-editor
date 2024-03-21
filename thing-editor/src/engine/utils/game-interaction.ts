import { Point } from 'pixi.js';
import game from 'thing-editor/src/engine/game';
import Button from 'thing-editor/src/engine/lib/assets/src/basic/button.c';
import type Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';
import L from 'thing-editor/src/engine/utils/l';
import Sound from 'thing-editor/src/engine/utils/sound';

const globalPoint = new Point();
const stagePoint = new Point();

const mouseHandlerGlobalDown = (ev: PointerEvent) => {
	game.mouse.click = true;
	mouseHandlerGlobal(ev);
	if (
		/// #if EDITOR
		!game.__EDITOR_mode &&
		!game.__paused &&
		/// #endif

		game.currentContainer && (game.currentContainer as Scene).onMouseDown && game.currentContainer.interactiveChildren) {
		Sound._unlockSound();
		(game.currentContainer as Scene).onMouseDown(game.mouse, ev);
	}
};

const mouseHandlerGlobalUp = (ev: PointerEvent) => {
	game.mouse.click = false;
	mouseHandlerGlobal(ev);
	if (
		/// #if EDITOR
		!game.__EDITOR_mode &&
		!game.__paused &&
		/// #endif
		game.currentContainer && (game.currentContainer as Scene).onMouseUp && game.currentContainer.interactiveChildren) {
		(game.currentContainer as Scene).onMouseUp(game.mouse, ev);
	}
};

const mouseHandlerGlobalMove = (ev: PointerEvent) => {
	if (ev.buttons === 0) {
		game.mouse.click = false;
	}
	mouseHandlerGlobal(ev);
	if (
		/// #if EDITOR
		!game.__EDITOR_mode &&
		!game.__paused &&
		/// #endif
		game.currentContainer && (game.currentContainer as Scene).onMouseMove && game.currentContainer.interactiveChildren) {
		(game.currentContainer as Scene).onMouseMove(game.mouse, ev);
	}
};

const mouseHandlerGlobal = (ev: PointerEvent) => {
	const canvasBounds = (game.pixiApp.view as HTMLCanvasElement).getBoundingClientRect();


	const canvasScale = (game._isCanvasRotated ? game.H : game.W) / canvasBounds.width;
	globalPoint.x = (ev.clientX - canvasBounds.x) * canvasScale;
	globalPoint.y = (ev.clientY - canvasBounds.y) * canvasScale;

	game.stage.toLocal(globalPoint, game.pixiApp.stage, stagePoint, true);

	let x = Math.round(stagePoint.x);
	let y = Math.round(stagePoint.y);

	/// #if EDITOR
	game.editor.mouseX = ev.clientX;
	game.editor.mouseY = ev.clientY;
	game.__mouse_EDITOR.x = globalPoint.x;
	game.__mouse_EDITOR.y = globalPoint.y;
	game.__mouse_uncropped.x = x;
	game.__mouse_uncropped.y = y;
	/// #endif

	if (x > game.W) {
		x = game.W;
	} else if (x < 0) {
		x = 0;
	}

	if (y > game.H) {
		y = game.H;
	} else if (y < 0) {
		y = 0;
	}
	game.mouse.x = x;
	game.mouse.y = y;
};


if ((window as KeyedObject).cordova) {
	document.addEventListener('backbutton', function () {
		Button._tryToClickByKeycode(27);
	}, false);
	game.exitApp = (enforced = false) => {
		if (enforced) {
			(navigator as any).app.exitApp();
		} else {

			game.showQuestion(L('SUREEXIT_TITLE'), L('SUREEXIT_TEXT'), undefined, () => {
				(game as any).exitApp(true);
			});
		}
	};
}

/// #if DEBUG
/// #if EDITOR
/*
/// #endif
window.addEventListener('error', function (er: ErrorEvent) {
	let txt = er.error.stack || er.error.message;
	game.__showDebugError(txt);
});//*/
/// #endif

let onClickOnceCallbacks: ((ev: PointerEvent) => void)[] = [];

function addOnClickOnce(callback: (ev: PointerEvent) => void) {
	onClickOnceCallbacks.push(callback);
}
/// #if EDITOR
(addOnClickOnce as SelectableProperty).___EDITOR_isHiddenForChooser = true;
/// #endif

export default function initGameInteraction() {
	const clickHandler = (ev: PointerEvent) => { // calls browsers functions which require to be fired in user context event
		while (onClickOnceCallbacks.length > 0) {
			let f = onClickOnceCallbacks.shift();
			(f as (ev: PointerEvent) => void)(ev);
		}
		/// #if EDITOR
		return;
		/// #endif
		if (game.isMobile.any ? game.projectDesc.autoFullScreenMobile : game.projectDesc.autoFullScreenDesktop) {	// eslint-disable-line no-unreachable
			if (game.fullscreen.isAvailable && !game.fullscreen.isFullscreen) {
				game.fullscreen._openInner();
			}
		}
	};

	const canvas = game.pixiApp.view as HTMLCanvasElement;

	canvas.addEventListener('click', clickHandler as any);
	canvas.addEventListener('touchend', clickHandler as any);


	window.addEventListener('pointerdown', mouseHandlerGlobalDown);
	window.addEventListener('pointermove', mouseHandlerGlobalMove);
	window.addEventListener('pointerup', mouseHandlerGlobalUp);
}

export { addOnClickOnce, mouseHandlerGlobal };

