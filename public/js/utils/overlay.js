/*
    helper and debugging drawing over game's viewport
 */

import Selection from "./selection.js";
import Pool from "../../../thing-engine/js/utils/pool.js";

let blackout;


let isPreviewShowed;

let draggers = [];

function checkIfCurrentContainerIsShowedPrefab() {
	assert(isPreviewShowed === game.currentContainer.name, "game.currentContainer.name is incorrect. Prefabs name expected.");
}

function createDragger(owner, constructor) {
	let ret = Pool.create(constructor);
	draggers.push(ret);
	ret.owner = owner;
	ret.info = __getNodeExtendData(owner);
	return ret;
}

let savedSelection;

export default class Overlay {
	
	constructor() {
		game.pixiApp.ticker.add(refreshSelection);
		
		blackout = new PIXI.Sprite();
		blackout.texture = PIXI.Texture.WHITE;
		blackout.tint = 30;
		blackout.alpha = 0.9;
		blackout.width = W;
		blackout.height = H;
	}
	
	getBGcolor() {
		return blackout.tint;
	}
	
	setBGcolor(tint) {
		if(tint === undefined) {
			tint = 30;
		} else if(isPreviewShowed) {
			checkIfCurrentContainerIsShowedPrefab();
			editor.settings.setItem('prefab-bg'+ game.currentContainer.name, tint);
		}
		
		blackout.tint = tint;
	}
	
	showPreview(object) {
		this.setBGcolor(editor.settings.getItem('prefab-bg' + object.name));
		this.hidePreview(false);
		savedSelection = editor.selection.saveSelection();
		game.stage.addChild(blackout);
		__getNodeExtendData(blackout).hidden = true;
		isPreviewShowed = object.name;
		game.showModal(object);
		checkIfCurrentContainerIsShowedPrefab();
		editor.history.updateUi();
	}
	
	hidePreview(refresh = true) {
		if (blackout.parent) {
			game.stage.removeChild(blackout);
		}
		if (isPreviewShowed) {
			checkIfCurrentContainerIsShowedPrefab();
			game.hideModal(game.currentContainer);
			editor.selection.loadSelection(savedSelection);
			isPreviewShowed = null;
			if(refresh === true) {
			    editor.refreshTreeViewAndPropertyEditor();
            }
			editor.history.updateUi();
		}
	}
}

const p = new PIXI.Point();
let overedDragger, draggingDragger;

let currentPointer = 'initial';
function refreshSelection() {
	overedDragger = null;
	let i = draggers.length - 1;
	while (i >= 0) {
		let d = draggers[i];
		let info = __getNodeExtendData(d.owner);
		if (!info.isSelected || d.info !== info) {
			d.parent.removeChild(d);
			Pool.dispose(d);
			info.draggerPivot = null;
			info.draggerRotator = null;
			draggers.splice(i, 1);
		}
		if ((Math.abs(d.x - game.mouse.x) < 6) && (Math.abs(d.y - game.mouse.y) < 6)) {
			overedDragger = d;
		}
		i--;
	}
	let newPointer = overedDragger ? ((overedDragger instanceof Rotator) ? 'pointer' : 'move') : 'initial';
	if(currentPointer !== newPointer) {
		game.pixiApp.view.style.cursor = newPointer;
		currentPointer = newPointer;
	}
	
	editor.selection.some((o) => {
		let info = __getNodeExtendData(o);
		if (!info.draggerPivot) {
			info.draggerPivot = createDragger(o, Dragger);
			game.pixiApp.stage.addChild(info.draggerPivot);
			info.draggerRotator = createDragger(o, Rotator);
			game.pixiApp.stage.addChild(info.draggerRotator);
		}
		o.getGlobalPosition(p, true);
		info.draggerPivot.x = p.x;
		info.draggerPivot.y = p.y;
		let r = o.getGlobalRotation();
		info.draggerRotator.x = p.x + Math.cos(r) * 40;
		info.draggerRotator.y = p.y + Math.sin(r) * 40;
		info.draggerRotator.rotation = r;
	});
}

let startX, startY;

$(window).on('mousedown', (ev) => {
	if(ev.target === game.pixiApp.view) {
		if (overedDragger) {
			if(overedDragger instanceof Rotator && ev.buttons === 2) {
				editor.onSelectedPropsChange('rotation', 0);
			} else if (ev.buttons === 1 || ev.buttons === 2) {
				draggingDragger = overedDragger;
			}
		} else if(ev.target === game.pixiApp.view && ev.buttons === 1) {
			selectByStageClick(ev);
		} else if(ev.buttons === 2 && editor.selection.length > 0) {
			let info = __getNodeExtendData(editor.selection[0]);
			if(info.draggerPivot && info.draggerPivot.owner.parent) {
				draggingDragger = info.draggerPivot;
				draggingDragger.onDrag();
			}
		}
		if(draggingDragger) {
			startX = draggingDragger.x;
			startY = draggingDragger.y;
			if(ev.altKey) {
				editor.disableFieldsCache = true;
				editor.selection.some((o) => {
					o.parent.addChildAt(Lib._deserializeObject(Lib.__serializeObject(o)), o.parent.children.indexOf(o));
				});
				editor.disableFieldsCache = false;
				editor.ui.sceneTree.forceUpdate();
			}
		}
	}
});

let previousAllUnderMouse;
function selectByStageClick(ev) {
	let allUnderMouse = new Selection();
	let stack = [game.currentContainer];
	let i;
	
	while (stack.length > 0) {
		if (stack.length > 1000) throw new Error('owerflow');
		let o = stack.pop();
		let childs = o.children;
		let len = childs.length;
		for (i = 0; i < len; i++) {
			o = childs[i];
			if (o.children.length > 0) {
				stack.push(o);
			}
			if(o.containsPoint && o.worldVisible && o.containsPoint(game.mouse)) {
				allUnderMouse.push(o);
			}
		}
	}
	
	allUnderMouse.sortSelectedNodes();
	allUnderMouse.reverse();
	
	if(allUnderMouse.length > 0) {
		if(!previousAllUnderMouse || previousAllUnderMouse.some((prevObj, i) => {
			return prevObj !== allUnderMouse[i];
		})) {
			i = 0;
		} else {
			i = allUnderMouse.indexOf(editor.selection[0]) + 1;
		}
		
		editor.ui.sceneTree.selectInTree(allUnderMouse[i % allUnderMouse.length], ev.ctrlKey);
	} else {
		editor.selection.clearSelection(true);
	}
	previousAllUnderMouse = allUnderMouse;
}

$(window).on('mousemove', () => {
	if (draggingDragger && draggingDragger.owner.parent) {
		draggingDragger.onDrag();
	}
});

$(window).on('mouseup', () => {
	draggingDragger = null;
});

class Dragger extends DSprite {
	constructor() {
		super();
		this.texture = PIXI.Texture.fromImage('img/overlay/pivot.png');
	}
	
	onDrag() {
		let o = this.owner;
		
		if(game.mouse.shiftKey) {
			let dX = game.mouse.x - startX;
			let dY = game.mouse.y - startY;
			let angle = Math.atan2(dY, dX);
			angle /= Math.PI;
			angle *= 4;
			angle = Math.round(angle);
			angle /= 4.0;
			angle *= Math.PI;
			
			let len = Math.sqrt(dX * dX + dY * dY);
			p.x = startX + Math.cos(angle) * len;
			p.y = startY + Math.sin(angle) * len;
		} else {
			p.x = game.mouse.x;
			p.y = game.mouse.y;
		}
		
		o.parent.toLocal(p, undefined, p, true);
		
		editor.onSelectedPropsChange('x', Math.round(p.x - o.x), true);
		editor.onSelectedPropsChange('y', Math.round(p.y - o.y), true);
	}
}

class Rotator extends DSprite {
	constructor() {
		super();
		this.texture = PIXI.Texture.fromImage('img/overlay/rotator.png');
	}
	
	onDrag() {
		let o = this.owner;
		let info = __getNodeExtendData(o);
		let r = Math.atan2(game.mouse.y - info.draggerPivot.y, game.mouse.x - info.draggerPivot.x);
		if (game.mouse.shiftKey) {
			r = Math.round(r / Math.PI * 8.0) / 8.0 * Math.PI;
		}
		editor.onSelectedPropsChange('rotation', Math.round((r - info.draggerRotator.rotation)*1000.0)/1000.0, true);
	}
}