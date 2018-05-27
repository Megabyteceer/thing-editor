/*
    helper and debugging drawing over game's viewport
 */

import Editor from "../editor.js";
import Pool from "/engine/js/utils/pool.js";

var blackout = new PIXI.Sprite();
blackout.texture = PIXI.Texture.WHITE;
blackout.tint = 30;
blackout.alpha = 0.9;
blackout.width = W;
blackout.height = H;

var currentlyShowedPreview;

var draggers = [];

function createDragger(owner, constructor) {
	var ret = Pool.create(constructor);
	draggers.push(ret);
	ret.owner = owner;
	ret.info = __getNodeExtendData(owner);
	return ret;
}

var savedSelection;

export default class Overlay {
	
	constructor() {
		game.pixiApp.ticker.add(refreshSelection);
	}
	
	showPreview(object) {
		this.hidePreview(false);
		savedSelection = editor.selection.saveSelection();
		game.stage.addChild(blackout);
		__getNodeExtendData(blackout).hidden = true;
		currentlyShowedPreview = object;
		game.makeItModal(currentlyShowedPreview);
		editor.history.updateUi();
	}
	
	hidePreview(refresh = true) {
		if (blackout.parent) {
			game.stage.removeChild(blackout);
		}
		if (currentlyShowedPreview) {
			game.hideModal(currentlyShowedPreview);
			editor.selection.loadSelection(savedSelection);
			currentlyShowedPreview = null;
			if(refresh === true) {
			    editor.refreshTreeViewAndPropertyEditor();
            }
			editor.history.updateUi();
		}
	}
}

const p = new PIXI.Point();
const zeroPoint = new PIXI.Point();
var overedDragger, draggingDragger;

var currentPointer = 'initial';
function refreshSelection() {
	overedDragger = null;
	var i = draggers.length - 1;
	while (i >= 0) {
		var d = draggers[i];
		var info = __getNodeExtendData(d.owner);
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
	var newPointer = overedDragger ? ((overedDragger instanceof Rotator) ? 'pointer' : 'move') : 'initial';
	if(currentPointer !== newPointer) {
		game.pixiApp.view.style.cursor = newPointer;
		currentPointer = newPointer;
	}
	
	editor.selection.some((o) => {
		var info = __getNodeExtendData(o)
		if (!info.draggerPivot) {
			info.draggerPivot = createDragger(o, Dragger);
			game.pixiApp.stage.addChild(info.draggerPivot);
			info.draggerRotator = createDragger(o, Rotator);
			game.pixiApp.stage.addChild(info.draggerRotator);
		}
		o.getGlobalPosition(p, true);
		info.draggerPivot.x = p.x;
		info.draggerPivot.y = p.y;
		var r = o.getGlobalRotation();
		info.draggerRotator.x = p.x + Math.cos(r) * 40;
		info.draggerRotator.y = p.y + Math.sin(r) * 40;
		info.draggerRotator.rotation = r;
	});
}

var startX, startY;

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
			var info = __getNodeExtendData(editor.selection[0]);
			if(info.draggerPivot) {
				draggingDragger = info.draggerPivot;
				draggingDragger.onDrag();
			}
		}
		if(draggingDragger) {
			startX = draggingDragger.x;
			startY = draggingDragger.y;
			if(game.mouse.altKey) {
				editor.selection.some((o) => {
					o.parent.addChildAt(Lib._deserializeObject(Lib.__serializeObject(o)), o.parent.children.indexOf(o));
				});
				editor.ui.sceneTree.forceUpdate();
			}
		}
	}
});

function selectByStageClick(ev) {
	var root = game.currentContainer;
	var o = editor.selection[0] || root;
	
	var isSelectionInRoot = false;
	var p = o.parent;
	while(p) {
		if(p === root) {
			isSelectionInRoot = true;
			break;
		}
		p = p.parent;
	}
	if(!isSelectionInRoot) {
		o = root;
	}
	
	var start = o;
	var c = 0;
	while(c++ < 10000) {
		if(o.children && o.children.length > 0) {
			o = o.getChildAt(0);
		} else {
			var i = o.parent.getChildIndex(o) + 1;
			if(i < o.parent.children.length) {
				o = o.parent.getChildAt(i);
			} else {
				while(c++ < 10000) {
					o = o.parent;
					i = o.parent.getChildIndex(o) + 1;
					if (i < o.parent.children.length) {
						o = o.parent.getChildAt(i);
						break
					}
					if (o === root) {
						break;
					}
				}
			}
		}
		
		if(o.containsPoint && o.containsPoint(game.mouse)) {
			editor.ui.sceneTree.selectInTree(o, ev.ctrlKey);
			return;
		}
		if(o === start) {
			break;
		}
	}
	editor.selection.clearSelection(true);
}


$(window).on('mousemove', () => {
	if (draggingDragger) {
		draggingDragger.onDrag();
	}
});

$(window).on('mouseup', () => {
	draggingDragger = null;
});

class Dragger extends DSprite {
	constructor() {
		super();
		this.texture = PIXI.Texture.fromImage('editor/img/overlay/pivot.png');
	}
	
	onDrag() {
		var o = this.owner;
		
		o.parent.toLocal(game.mouse, undefined, p, true);
		
		if(game.mouse.shiftKey) {
			var dX = p.x - startX;
			var dY = p.y - startY;
			var angle = Math.atan2(dY, dX);
			angle /= Math.PI;
			angle *= 4;
			angle = Math.round(angle);
			angle /= 4.0;
			angle *= Math.PI;
			
			var len = Math.sqrt(dX * dX + dY * dY);
			p.x = startX + Math.cos(angle) * len;
			p.y = startY + Math.sin(angle) * len;
		}
		
		editor.onSelectedPropsChange('x', Math.round(p.x - o.x), true);
		editor.onSelectedPropsChange('y', Math.round(p.y - o.y), true);
	}
}

class Rotator extends DSprite {
	constructor() {
		super();
		this.texture = PIXI.Texture.fromImage('editor/img/overlay/rotator.png');
	}
	
	onDrag() {
		var o = this.owner;
		var info = __getNodeExtendData(o);
		var r = Math.atan2(game.mouse.y - info.draggerPivot.y, game.mouse.x - info.draggerPivot.x);
		if (game.mouse.shiftKey) {
			r = Math.round(r / Math.PI * 8.0) / 8.0 * Math.PI;
		}
		editor.onSelectedPropsChange('rotation', Math.round((r - info.draggerRotator.rotation)*1000.0)/1000.0, true);
	}
}