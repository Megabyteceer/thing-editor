
import type { DisplayObject, Sprite } from 'pixi.js';
import { Container, NineSlicePlane, Point } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath, { setValueByPath } from 'thing-editor/src/engine/utils/get-value-by-path';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

const tmpPoint = new Point();


function setObjectHeight(node: DisplayObject, height: number) {
	if (node instanceof Shape || node instanceof NineSlicePlane) { //prevent wrong size in next life of "bar" sprite instance
		node.height = height;
	} else if ((node as Sprite).texture) {
		node.scale.y = height / (node as Sprite).texture.height;
		if (game.classes.Fill && (node instanceof game.classes.Fill)) {
			(node as any).yRepeat = node.scale.y;
		}
	}
}

const TIP = `Contains string path to javascript variable to get value from.
As example path can be: <b>game.stage.height</b> or <b>this.parent.name</b>.
Supports <b>game</b>, <b>this</b> or Component's class name as root object.
Use '#' to access to child scene nodes by name: <b>game.currentScene.#myChildElementsName.x</b>.`;

export default class ProgressBar extends Container {

	@editable({ name: 'height', type: 'number', min: 0, default: 200 })

	@editable({ type: 'data-path', important: true, tip: TIP })
	dataPath = null;

	@editable({ min: 0 })
	capMargin = 5;

	@editable({ min: 0 })
	refreshInterval = 10;

	@editable({ type: 'callback' })
	onFinish = null;

	@editable({ type: 'callback' })
	onChanged = null;

	@editable({ type: 'callback' })
	afterSlide = null;

	@editable({ step: 0.00001 })
	min = 0;

	@editable({ step: 0.00001 })
	max = 100;

	@editable({ step: 0.00001, min: 0 })
	step = 1;

	@editable()
	smooth = false;

	@editable({ min: 0.000000001, step: 0.001, visible: o => o.smooth })
	smoothStep = 0.01;

	@editable({ min: 0, tip: 'progress bar launches animations "progress-item-1", "progress-item-2", ... during the progress' })
	itemsCount = 6;

	calledItem = 0;

	@editable({ type: 'ref' })
	bar?: Container;

	@editable({ type: 'ref' })
	cap?: Container;

	scrolling = false;

	currentInterval = 0;

	showedVal: any = undefined;

	isProgressFinished = true;

	private currentQ = 0;
	private targetQ = 0;

	init() {
		super.init();
		this.scrolling = false;
		this.currentInterval = 0;
		this.showedVal = undefined;
		this._initChildren();

		this.calledItem = 0;

		this.cursor = this.interactive ? 'pointer' : '';
		this.on('pointerdown', this.onDown);
		this._applyBgHeight();
		this.isProgressFinished = false;
	}

	_initChildren() {
		this.bar = this.findChildByName('bar');
		this.cap = this.findChildByName('cap');
	}

	_progress_bar_height = 200;

	get height() {
		return this._progress_bar_height;
	}

	set height(v) {
		if (this._progress_bar_height !== v) {
			this._progress_bar_height = v;
			this.applyValue(this.showedVal || 0);
			this._applyBgHeight();
		}
	}

	_applyBgHeight() {
		let h = this.getChildByName('bg');
		if (h) {
			setObjectHeight(h, this._progress_bar_height!);
		}
		const hitArea = this.findChildByName('hit-area');
		if (hitArea) {
			setObjectHeight(hitArea, this._progress_bar_height! + hitArea.y * -2);
		}
	}

	onRemove() {
		super.onRemove();
		this._progress_bar_height = 0;
		this.currentQ = 0;
		this.showedVal = undefined;
		this.bar = undefined;
		this.cap = undefined;
		this.removeListener('pointerdown', this.onDown);
		this.isProgressFinished = true;
	}

	onDown() {
		if (this.isCanBePressed) {
			this.scrolling = true;
		}
	}

	update() {
		if (this.scrolling) {
			if (game.mouse.click) {
				let p = this.toLocal(game.mouse, game.stage, tmpPoint, true);
				let q = p.y / this._progress_bar_height!;
				if (q < 0) {
					q = 0;
				} else if (q > 1) {
					q = 1;
				}
				let val = this.min + q * (this.max - this.min);
				if (this.step > 0) {
					val = Math.round(val / this.step) * this.step;
				}
				this.applyValue(val);
				if (this.dataPath) {
					setValueByPath(this.dataPath, val, this);
				}
			} else {
				this.scrolling = false;
				if (this.afterSlide) {
					callByPath(this.afterSlide, this);
				}
			}
		} else if (this.currentInterval <= 0 && this.dataPath) {
			let val = getValueByPath(this.dataPath, this);
			if (val || val === 0) {
				if (val > this.max) {
					val = this.max;
				}
				if (val < this.min) {
					val = this.min;
				}
				if (val !== this.showedVal) {
					this.applyValue(val);
				}
			} else {
				this.showedVal = undefined;
			}
			this.currentInterval = this.refreshInterval;
		} else {
			this.currentInterval--;
		}
		if (this.smooth) {
			this.currentQ = stepTo(this.currentQ, this.targetQ, this.smoothStep);
			this.applyQ();
		}
		super.update();
	}

	applyValue(val: number) {
		if (val !== this.showedVal) {
			if (this.onChanged
				/// #if EDITOR
				&& !game.__EDITOR_mode
				/// #endif
			) {
				callByPath(this.onChanged, this);
			}
		}
		let q = (val - this.min) / (this.max - this.min);
		this.targetQ = q;
		if (typeof this.showedVal === 'undefined') {
			this.currentQ = q;
		}
		this.showedVal = val;

		if (!this.smooth) {
			this.currentQ = q;
			this.applyQ();
		}
	}

	applyQ() {
		if (this.onFinish && !this.isProgressFinished && this.currentQ === 1) {
			this.isProgressFinished = true;
			callByPath(this.onFinish, this);
		}
		const reachedItem = Math.floor(this.currentQ * this.itemsCount);
		while (reachedItem > this.calledItem) {
			this.calledItem++;
			this.gotoLabelRecursive('progress-item-' + this.calledItem);
		}

		/// #if EDITOR
		if (game.__EDITOR_mode) {
			this._initChildren();
		}
		/// #endif
		if (this.bar) {
			setObjectHeight(this.bar, this._progress_bar_height * this.currentQ);
		}
		if (this.cap) {
			this.cap.y = this.capMargin + (this._progress_bar_height - this.capMargin * 2) * this.currentQ;
		}
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			this.bar = undefined;
			this.cap = undefined;
		}
		/// #endif
	}

	refreshNow() {
		this.currentInterval = 0;
	}

	/// #if EDITOR
	__beforeDeserialization() {
		this._progress_bar_height = 0;
	}

	__afterDeserialization() {
		this._applyBgHeight();
	}
	/// #endif
}
