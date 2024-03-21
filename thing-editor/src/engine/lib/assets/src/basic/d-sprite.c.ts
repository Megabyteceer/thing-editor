import { Sprite } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';

export default class DSprite extends Sprite {
	constructor() {
		super();
		this.anchor.set(0.5);
	}

	@editable({ step: 0.001, animate: true })
	xSpeed = 0;

	@editable({ step: 0.001, animate: true })
	ySpeed = 0;

	@editable({ step: 0.001, animate: true })
	rSpeed = 0;

	angleBySpeed() {
		this.rotation = Math.atan2(this.ySpeed, this.xSpeed);
	}

	update() {
		this.x += this.xSpeed;
		this.y += this.ySpeed;
		this.rotation += this.rSpeed;
		super.update();
	}
}

/// #if EDITOR
DSprite.__EDITOR_icon = 'tree/dsprite';
/// #endif
