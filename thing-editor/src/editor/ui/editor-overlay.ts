import { Container, Point, Sprite } from "pixi.js";
import { editorEvents } from "thing-editor/src/editor/utils/editor-events";

import getParentWhichHideChildren from "thing-editor/src/editor/utils/get-parent-with-hidden-children";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import protectAccessToSceneNode from "thing-editor/src/editor/utils/protect-access-to-node";
import Selection from "thing-editor/src/editor/utils/selection";
import __GizmoArrow from "thing-editor/src/engine/components/__system/gizmo-arrow.c";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

let selectionDisabled = false;
let isViewPortScrolling = false;
let scrollingX = 0;
let scrollingY = 0;

let rightButtonDraggingStarted = false;

const overlayLayer = new Container();

function initializeGizmo() {
	protectAccessToSceneNode(overlayLayer, 'gizmoLayer');
	game.stage.parent.addChild(overlayLayer);
	game.__EDITOR_mode = false;
	const gizmo = Lib.loadPrefab('__system/gizmo');
	game.__EDITOR_mode = true;
	overlayLayer.addChild(gizmo);

	game.pixiApp.ticker.add(() => {
		overlayLayer.update();
	});
}

editorEvents.once('didProjectOpen', () => {

	(document.querySelector('#viewport-root') as HTMLDivElement).addEventListener('mousedown', function onMouseDown(ev: MouseEvent) {
		if(game.pixiApp && (ev.target === game.pixiApp.view)) {
			if(ev.buttons === 4) {
				isViewPortScrolling = true;
				scrollingX = game.__mouse_EDITOR.x;
				scrollingY = game.__mouse_EDITOR.y;
			} else if(ev.buttons === 2) {
				if(!__GizmoArrow.overedArrow) {
					moveSelectionToMouse(ev);
					rightButtonDraggingStarted = true;
				}
			} else {
				if(!selectionDisabled && ev.buttons === 1 && !__GizmoArrow.overedArrow) {
					selectByStageClick(ev);
				}
			}
		} else {
			game.editor.selection.clearSelection();
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
				}
			} else if(ev.buttons === 2 && (rightButtonDraggingStarted || (ev.target === game.pixiApp.view)) && !__GizmoArrow.draggedArrow) {
				moveSelectionToMouse(ev);
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
			zoom *= 1 - ev.deltaY / 500;

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
		}
	});

	initializeGizmo();

});


const p = new Point();

function moveSelectionToMouse(ev: MouseEvent) {
	if(game.editor.selection.length > 0) {
		game.editor.selection[0].parent.toLocal(game.__mouse_uncropped, game.stage, p);
		moveSelectionToPoint(p.x - game.editor.selection[0].x, p.y - game.editor.selection[0].y, ev.ctrlKey);
	}
}

function moveSelectionToPoint(dX: number, dY: number, withoutChildren = false) {
	if(game.editor.selection.length > 0) {

		dX = Math.round(dX);
		dY = Math.round(dY);

		dX -= game.editor.selection[0].x % 1;
		dY -= game.editor.selection[0].y % 1;

		if(withoutChildren) {
			for(let s of game.editor.selection) {
				game.editor.moveContainerWithoutChildren(s, dX, dY);
			}
		} else {
			if(game.editor.ui.propsEditor.editableProps.x) {
				game.editor.onSelectedPropsChange('x', dX, true);
			} else {
				game.editor.ui.propsEditor.selectField('x');
				game.editor.ui.modal.notify('x property locked');
			}
			if(game.editor.ui.propsEditor.editableProps.y) {
				game.editor.onSelectedPropsChange('y', dY, true);
			} else {
				game.editor.ui.propsEditor.selectField('y')
				game.editor.ui.modal.notify('y property locked');
			}
		}
	}
}

function isObjectUnderMouse(o: Container) {
	return ((o as Sprite).containsPoint && (!o.__lockSelection) && o.worldVisible && o.worldAlpha && (o as Sprite).containsPoint(game.__mouse_EDITOR));
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

	let a = [PrefabEditor.currentPrefabName ? game.currentContainer : game.stage];

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

export default overlayLayer;

export { moveSelectionToPoint };
