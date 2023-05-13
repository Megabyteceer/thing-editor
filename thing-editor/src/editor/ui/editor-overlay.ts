import { Container, Point, Sprite } from "pixi.js";
import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import Selection from "thing-editor/src/editor/utils/selection";
import game from "thing-editor/src/engine/game";

let selectionDisabled = false;
let isViewPortScrolling = false;
let scrollingX = 0;
let scrollingY = 0;
let isolation: Container[] = [];
let isPreviewShowed = false;

const p = new Point();

let rightButtonDraggingStarted = false;

const initializeOverlay = () => {

	window.addEventListener('mousedown', function onMouseDown(ev: MouseEvent) {
		if(game.pixiApp && (ev.target === game.pixiApp.view)) {
			if(ev.buttons === 4) {
				isViewPortScrolling = true;
				scrollingX = game.__mouse_EDITOR.x;
				scrollingY = game.__mouse_EDITOR.y;
			} else if(ev.buttons === 2) {
				moveSelectionTo(ev);
				rightButtonDraggingStarted = true;
			} else {
				if(!selectionDisabled && ev.buttons === 1) {
					selectByStageClick(ev);
				}
			}
		}
	});

	window.addEventListener('mousemove', function onMouseMove(ev: MouseEvent) {
		if(game.pixiApp) {
			if(isViewPortScrolling) {
				if(ev.buttons !== 4) {
					isViewPortScrolling = false;
				} else {
					let dX = game.__mouse_EDITOR.x - scrollingX;
					let dY = game.__mouse_EDITOR.y - scrollingY;
					game.stage.x += dX;
					game.stage.y += dY;


					scrollingX = game.__mouse_EDITOR.x;
					scrollingY = game.__mouse_EDITOR.y;
					game.editor.ui.viewport.refreshCameraFrame();
				}
			} else if(ev.buttons === 2 && (rightButtonDraggingStarted || (ev.target === game.pixiApp.view))) {
				moveSelectionTo(ev);
				rightButtonDraggingStarted = true;
			}
		}
	});

	window.addEventListener('mouseup', function onMouseMove(_ev: MouseEvent) {
		rightButtonDraggingStarted = false;
	});

	window.addEventListener('wheel', function onWheel(ev) {
		if(game.pixiApp && (ev.target === game.pixiApp.view)) {

			let pivot = game.stage.toLocal(game.__mouse_EDITOR, game.stage.parent);


			let zoom = game.stage.scale.x;
			zoom *= 1 - ev.deltaY / 1000;

			if(Math.abs(zoom - 1.0) < 0.01) {
				zoom = 1;
			}
			if(zoom > 32) {
				zoom = 32;
			}
			if(zoom < 0.02) {
				zoom = 0.02;
			}
			game.stage.x += (pivot.x * game.stage.scale.x - pivot.x * zoom);
			game.stage.y += (pivot.y * game.stage.scale.y - pivot.y * zoom);

			game.stage.scale.x = zoom;
			game.stage.scale.y = zoom;
			game.editor.ui.viewport.refreshCameraFrame();
		}
	});
};


function moveSelectionTo(ev: MouseEvent) {
	if(game.editor.selection.length > 0) {
		let dX = game.__mouse_uncropped.x - game.editor.selection[0].x;
		let dY = game.__mouse_uncropped.y - game.editor.selection[0].y;

		if(ev.ctrlKey) {
			for(let s of game.editor.selection) {
				game.editor.moveContainerWithoutChildren(s, dX, dY);
			}
		} else {
			game.editor.onSelectedPropsChange('x', dX, true);
			game.editor.onSelectedPropsChange('y', dY, true);
		}
	}
}


function isObjectUnderMouse(o: Container) {
	return ((o as Sprite).containsPoint && (!o.__lockSelection) && o.worldVisible && (o as Sprite).containsPoint(game.__mouse_EDITOR));
}

let previousAllUnderMouse: Container[];
function selectByStageClick(ev: MouseEvent) {

	if(document.fullscreenElement) {
		return;
	}

	let allUnderMouse = new Selection();
	let i;

	const checkNodeToSelect = (o: Container) => {
		if(isObjectUnderMouse(o)) {
			let parentWhichHideChildren = getParentWhichHideChildren(o);
			if(parentWhichHideChildren) {
				if((parentWhichHideChildren !== game.stage) && ((allUnderMouse).indexOf(parentWhichHideChildren) < 0)) {
					allUnderMouse.push(parentWhichHideChildren);
				}
			} else {
				let p = o;
				while(p) {
					if(p === game.stage) {
						allUnderMouse.push(o);
						break;
					}
					if(p.__lockSelection) {
						break;
					}
					p = p.parent;
				}

			}
		}
	};

	let a;
	if(isolation.length > 0) {
		a = isolation;
	} else {
		a = [isPreviewShowed ? game.currentContainer : game.stage];
	}
	for(let c of a) {
		checkNodeToSelect(c);
		c.forAllChildren(checkNodeToSelect);
	}

	allUnderMouse.sortSelectedNodes();
	allUnderMouse.reverse();

	if(allUnderMouse.length > 0) {
		if(!previousAllUnderMouse || previousAllUnderMouse.some((prevObj, i) => {
			return prevObj !== allUnderMouse[i];
		})) {
			i = 0;
		} else {
			i = allUnderMouse.indexOf(getParentWhichHideChildren(game.editor.selection[0]) || game.editor.selection[0]) + 1;
		}
		let o = allUnderMouse[i % allUnderMouse.length];
		game.editor.ui.sceneTree.selectInTree(o, ev.ctrlKey);
	} else {
		game.editor.selection.clearSelection(true);
	}
	previousAllUnderMouse = allUnderMouse;
}

export default initializeOverlay;