import { Container, Point } from 'pixi.js';
import fs from 'thing-editor/src/editor/fs';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';

const p0 = new Point(0, 0);
const p1 = new Point(1, 1);
const p = new Point();
const p2 = new Point();

/// #if EDITOR
const afterEdited = () => {
	for (const o of game.editor.selection as any as Resizer[]) {
	 o.recalculateSize();
	}
};
/// #endif

export default class Resizer extends Container {

	init() {
		super.init();
		this.recalculateSize();
	}

	_onRenderResize() {
		this.recalculateSize();
	}

	recalculateSize() {
		if (this.fixed && this.parent) {
			if (this.relativeX || this.relativeY) {
				p.x = Math.round(this._xPos * game.W);
				p.y = Math.round(this._yPos * game.H);
				this.parent.toLocal(p, game.stage, p, false);
				if (this.relativeX) {
					this.x = p.x;
				}
				if (this.relativeY) {
					this.y = p.y;
				}
			}

			if (this.resizeX || this.resizeY) {
				this.parent.toLocal(p0, game.stage, p, false);
				this.parent.toLocal(p1, game.stage, p2, false);
				if (this.resizeX) {
					this.scale.x = game.W / game.projectDesc.width * ((p2.x - p.x) || 0.000001);
				}
				if (this.resizeY) {
					this.scale.y = game.H / game.projectDesc.height * ((p2.y - p.y) || 0.000001);
				}
			}
		} else {
			if (this.resizeX) {
				this.scale.x = game.W / game.projectDesc.width;
			}
			if (this.resizeY) {
				this.scale.y = game.H / game.projectDesc.height;
			}
			if (this.relativeX) {
				this.x = Math.round(game.W * this._xPos);
			}
			if (this.relativeY) {
				this.y = Math.round(game.H * this._yPos);
			}
		}
	}

	update() {
		if (this.fixed) {
			this.recalculateSize();
		}
		super.update();
	}

	/// #if EDITOR

	_resizeX = false;

	@editable()
	set resizeX(v) {
		this._resizeX = v;
		if (game.__EDITOR_mode) {
			if (!v) {
				this.scale.x = 1;
			}
		}
	}

	get resizeX() {
		return this._resizeX;
	}

	_resizeY = false;

	@editable()
	set resizeY(v) {
		this._resizeY = v;
		if (game.__EDITOR_mode) {
			if (!v) {
				this.scale.y = 1;
			}
		}
	}

	get resizeY() {
		return this._resizeY;
	}
	/// #endif

	@editable()
	relativeX = false;

	_xPos = 0;

	@editable({ min: -1, max: 1, step: 0.01, visible: (o) => { return o.relativeX; } })
	set xPos(v) {
		this._xPos = v;
		if (this.relativeX) {
			this.recalculateSize();
		}
	}

	get xPos() {
		return this._xPos;
	}

	@editable()
	relativeY = false;

	_yPos = 0;

	@editable({ min: -1, max: 1, step: 0.01, visible: (o) => { return o.relativeY; } })
	set yPos(v) {
		this._yPos = v;
		if (this.relativeY) {
			this.recalculateSize();
		}
	}

	get yPos() {
		return this._yPos;
	}

	/// #if EDITOR
	__beforeSerialization() {
		if (!game.projectDesc.dynamicStageSize && !fs.getFileOfRoot(this).lib) {
			game.editor.ui.status.warn('Resizer is not useful if projects dynamicStageSize is not set to true', 32025, this);
		}
	}

	__afterDeserialization() {
		this.recalculateSize();
	}

	__afterSerialization(data: SerializedObject) {
		if (this.resizeX) {
			delete data.p['scale.x'];
		}
		if (this.resizeY) {
			delete data.p['scale.y'];
		}
		if (this.relativeX) {
			delete data.p.x;
		}
		if (this.relativeY) {
			delete data.p.y;
		}
	}
	/// #endif

	@editable({afterEdited, visible: (o) => { return o.resizeX || o.resizeY || o.relativeY || o.relativeX; } })
	fixed = false;

}


/// #if EDITOR


Resizer.__EDITOR_icon = 'tree/resizer';

Resizer.__EDITOR_tip = '<b>Resizer</b> - component has sense only for project with <b>dynamicStageSize</b>';

/// #endif
