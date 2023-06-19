
import { DisplayObject, NineSlicePlane, Point, Sprite } from "pixi.js";
import editable from "thing-editor/src/editor/props-editor/editable";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";
import Container from "thing-editor/src/engine/lib/container.c.ts";
import Shape from "thing-editor/src/engine/lib/shape.c";
import callByPath from "thing-editor/src/engine/utils/call-by-path";
import getValueByPath, { setValueByPath } from "thing-editor/src/engine/utils/get-value-by-path";

const tmpPoint = new Point();


function setObjectHeight(node: DisplayObject, height: number) {
	if(node instanceof Shape || node instanceof NineSlicePlane) { //prevent wrong size in next life of "bar" sprite instance
		node.height = height;
	} else if((node as Sprite).texture) {
		node.scale.y = height / (node as Sprite).texture.height;
		/* TODO if(node instanceof Fill) {
			node.yRepeat = node.scale.y;
		} */
	}
}

const TIP = `Contains string path to javascript variable to get value from.
As example path can be: <b>game.stage.height</b> or <b>this.parent.name</b>.
Supports <b>game</b>, <b>this</b> or Component's class name as root object.
Use '#' to acess to child scene nodes by name: <b>game.currentScene.#myChildElementsName.x</b>.`;

export default class ProgressBar extends Container {

	@editable({ name: 'height', type: 'number', min: 0, default: 200 })

	@editable({ type: 'data-path', important: true, tip: TIP })
	dataPath = null

	@editable({ min: 0 })
	capMargin = 5

	@editable({ min: 0 })
	refreshInterval = 10

	@editable({ type: 'callback' })
	onFinish = null;

	@editable({ type: 'callback' })
	onChanged = null;

	@editable({ type: 'callback' })
	afterSlide = null;

	@editable({ step: 0.00001 })
	min = 0

	@editable({ step: 0.00001 })
	max = 100

	@editable({ step: 0.00001, min: 0 })
	step = 1

	@editable({ type: 'ref' })
	bar?: Container;

	@editable({ type: 'ref' })
	cap?: Container;

	scrolling = false;

	currentInterval = 0;

	showedVal: any = undefined;

	isProgressFinished = false;

	init() {
		super.init();
		this.scrolling = false;
		this.currentInterval = 0;
		this.showedVal = undefined;
		this.isProgressFinished = false;
		this.bar = this.findChildByName('bar');
		this.cap = this.findChildByName('cap');


		this.cursor = this.interactive ? 'pointer' : '';
		this.on('pointerdown', this.onDown);
		this._applyBgHeight();
	}

	_progress_bar_height: number = 200;

	get height() {
		return this._progress_bar_height;
	}

	set height(v) {
		if(this._progress_bar_height !== v) {
			this._progress_bar_height = v;
			this.applyValue(this.showedVal || 0);
			this._applyBgHeight();
		}
	}

	_applyBgHeight() {
		let h = this.getChildByName('bg');
		if(h) {
			setObjectHeight(h, this._progress_bar_height!);
		}
	}

	onRemove() {
		super.onRemove();
		//@ts-ignore
		this._progress_bar_height = 0;
		this.bar = undefined;
		this.cap = undefined;
		this.removeListener('pointerdown', this.onDown);
	}

	onDown() {
		if(this.isCanBePressed) {
			this.scrolling = true;
		}
	}

	update() {
		if(this.scrolling) {
			if(game.mouse.click) {
				let p = this.toLocal(game.mouse, game.stage, tmpPoint, true);
				let q = p.y / this._progress_bar_height!;
				if(q < 0) {
					q = 0;
				} else if(q > 1) {
					q = 1;
				}
				let val = this.min + q * (this.max - this.min);
				if(this.step > 0) {
					val = Math.round(val / this.step) * this.step;
				}
				this.applyValue(val);
				if(this.dataPath) {
					setValueByPath(this.dataPath, val, this);
				}
			} else {
				this.scrolling = false;
				if(this.afterSlide) {
					callByPath(this.afterSlide, this);
				}
			}
		} else if(this.currentInterval <= 0 && this.dataPath) {
			let val = getValueByPath(this.dataPath, this);
			if(val || val === 0) {
				if(val > this.max) {
					val = this.max;
				}
				if(val < this.min) {
					val = this.min;
				}
				if(val !== this.showedVal) {
					this.visible = true;
					this.applyValue(val);
				}
			} else {
				this.showedVal = undefined;
				this.visible = false;
			}
			this.currentInterval = this.refreshInterval;
		} else {
			this.currentInterval--;
		}
		super.update();
	}

	applyValue(val: number) {
		if(val !== this.showedVal) {
			if(this.onChanged
				/// #if EDITOR
				&& !game.__EDITOR_mode
				/// #endif
			) {
				callByPath(this.onChanged, this);
			}
		}
		this.showedVal = val;

		if(this.onFinish && !this.isProgressFinished && val === this.max) {
			this.isProgressFinished = true;
			callByPath(this.onFinish, this);
		}

		let q = (val - this.min) / (this.max - this.min);
		if(this.bar) {
			setObjectHeight(this.bar, this._progress_bar_height * q);
		}
		if(this.cap) {
			this.cap.y = this.capMargin + (this._progress_bar_height - this.capMargin * 2) * q;
		}
	}

	refreshNow() {
		this.currentInterval = 0;
	}

	/// #if EDITOR
	__beforeDeserialization() {
		//@ts-ignore
		this._progress_bar_height = 0;
	}

	__afterDeserialization() {
		this._applyBgHeight();
	}

	__EDITOR_onCreate() {
		this.interactive = true;
		for(let childData of [
			{
				"c": "Sprite",
				"p": {
					"name": "bg",
					"alpha": 0.5,
					"interactive": true,
					"scale.y": 20.8,
					"image": "WHITE"
				}
			},
			{
				"c": "Sprite",
				"p": {
					"name": "bar",
					"interactive": true,
					"scale.y": 13.666666666666666,
					"image": "WHITE",
					"tint": 65280
				}
			},
			{
				"c": "Sprite",
				"p": {
					"name": "cap",
					"x": 5,
					"interactive": true,
					"scale.x": 2,
					"scale.y": 2,
					"pivot.x": 5,
					"pivot.y": 5,
					"image": "WHITE"
				}
			}]
		) {
			let c = Lib._loadClassInstanceById(childData.c);
			Object.assign(c, childData.p);
			this.addChild(c);
		}
	}
	/// #endif
}
