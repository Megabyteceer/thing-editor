/*
    helper and debugging drawing ower game's viewport
 */

import Editor from "../editor.js";
import Pool from "/engine/js/utils/pool.js";

var backdrop = new Sprite(PIXI.Texture.WHITE);
backdrop.tint = 30;
backdrop.alpha = 0.9;
backdrop.x = W / 2;
backdrop.y = H / 2;
backdrop.width = W;
backdrop.height = H;
var currentlyShowedPreview;

var pivotImage = PIXI.Texture.fromImage('editor/img/overlay/pivot.png');
var rotatorImage = PIXI.Texture.fromImage('editor/img/overlay/rotator.png');

var draggers = [];

function createDragger(owner, constructor) {
	var ret = Pool.create(constructor);
	draggers.push(ret);
	ret.owner = owner;
	return ret;
}

export default class Overlay {
	
	constructor() {
		game.pixiApp.ticker.add(refreshSelection);
	}
	
	showPreview(object) {
		this.hidePreview();
		game.stage.addChild(backdrop);
		currentlyShowedPreview = object;
		game.stage.addChild(currentlyShowedPreview);
	}
	
	hidePreview() {
		if (backdrop.parent) {
			game.stage.removeChild(backdrop);
		}
		if (currentlyShowedPreview) {
			game.stage.removeChild(currentlyShowedPreview); ////TODO: pool dispose. When poolling will be ready.
			currentlyShowedPreview = null;
		}
	}
}

const p = new PIXI.Point();
const p2 = new PIXI.Point();
var overedDragger, draggingDragger;

function refreshSelection() {
	overedDragger = null;
	var i = draggers.length - 1;
	while (i >= 0) {
		var d = draggers[i];
		var info = __getNodeExtendData(d.owner);
		if (!info.isSelected) {
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
	
	game.pixiApp.view.style.cursor = overedDragger ? ((overedDragger.texture === rotatorImage) ? 'pointer' : 'move') : 'initial';
	
	EDITOR.selection.some((o) => {
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
	});
}

$(window).on('mousedown', (ev) => {
	if (overedDragger && (ev.buttons === 1)) {
		draggingDragger = overedDragger;
	}
});

$(window).on('mousemove', () => {
	if (draggingDragger) {
		draggingDragger.onDrag();
	}
});

$(window).on('mouseup', () => {
	draggingDragger = null;
});

class Dragger extends Sprite {
	constructor() {
		super();
		this.texture = pivotImage;
	}
	
	onDrag() {
		var o = this.owner;
		EDITOR.onSelectedPropsChange('x', game.mouse.x - this.owner.x, true);
		EDITOR.onSelectedPropsChange('y', game.mouse.y - this.owner.y, true);
	}
}

class Rotator extends Sprite {
	constructor() {
		super();
		this.texture = rotatorImage;
	}
	
	onDrag() {
		var o = this.owner;
		var r = Math.atan2(game.mouse.y - o.y, game.mouse.x - o.x);
		if (game.mouse.shiftKey) {
			r = Math.round(r / Math.PI * 8.0) / 8.0 * Math.PI;
		}
		EDITOR.onSelectedPropsChange('rotation', r - this.owner.rotation, true);
	}
}