import Lib from "../lib.js";
import game from "../game.js";

const PI_2 = Math.PI * 2;

const zeroPoint = new PIXI.Point();
const p1 = new PIXI.Point();
const p2 = new PIXI.Point();

export default class Fill extends PIXI.SimplePlane {

	constructor() {
		super(Lib.getTexture('WHITE'));
		this.uploadUvTransform = false;
		this.autoUpdate = false;
	}

	init() {
		super.init();
		this.initialScaleX = this.scale.x;
		this.initialScaleY = this.scale.y;
		this.applyAutoCrop();
	}

	_onRenderResize() {
		
		this.applyAutoCrop();
	}

	_refresh() {
		this._applied_verticesX = this.verticesX;
		this._applied_verticesY = this.verticesY;
		super._refresh();
		this.updateFilling();
		this.fillUpdated = false;
	}

	refresh(forced) {
		forced = forced || this._applied_verticesX !== this.verticesX || this._applied_verticesY !== this.verticesY;
		if(forced) {
			this.fillUpdated = true;
		}
		super.refresh(forced);
		if(this.fillUpdated) {
			this.updateFilling();
			this.fillUpdated = false;
		}
	}

	applyAutoCrop() {
		if(this.autoCrop) {
			/// #if EDITOR
			if(game.__EDITOR_mode) {
				return;
			}
			if(this.getGlobalRotation() !== 0) {
				editor.ui.status.warn("autoCrop does not work correct for rotated Fill", 99999, this, 'autoCrop');
			}
			/// #endif

			let w = this.texture.width;
			let h = this.texture.height;
			

			this.pivot.x = 0;
			this.pivot.y = 0;
			this.scale.x = this.initialScaleX;
			this.scale.y = this.initialScaleY;

			p1.x = game.W;
			p1.y = game.H;
			this.toLocal(p1, game.currentContainer, p2, false);
			this.toLocal(zeroPoint, game.currentContainer, p1);


			let cropLeft = Math.floor(Math.max(0, p1.x));
			let cropRight = Math.floor(Math.max(0, w - p2.x));
			if((cropLeft + cropRight) >= w) {
				this.visible = false;
				return;
			}
			this.cropLeftRight(cropLeft, cropRight);
			this.scale.x *= this.initialScaleX;
			this.pivot.x = -cropLeft / this.scale.x * this.initialScaleX;

		
			let cropTop = Math.floor(Math.max(0, p1.y));
			let cropBottom = Math.floor(Math.max(0, h - p2.y));
			if((cropTop + cropBottom) >= h) {
				this.visible = false;
				return;
			}
			this.cropTopBottom(cropTop, cropBottom);
			this.scale.y *= this.initialScaleY;
			this.pivot.y = -cropTop / this.scale.y * this.initialScaleY;

			this.visible = true;
		}
	}

	cropLeftRight(leftSize, rightSize) {
		let textureW = this.texture.width;
		leftSize /= textureW;
		rightSize /= textureW;
		if(leftSize < 0) {
			leftSize = 0;
		}
		if(rightSize < 0) {
			rightSize = 0;
		}
		this.scale.x = Math.min(1, 1 - leftSize - rightSize);
		this.xRepeat = this.scale.x;
		this.xShift = leftSize;
	}

	cropTopBottom(topSize, bottomSize) {
		let textureH = this.texture.height;
		topSize /= textureH;
		bottomSize /= textureH;
		if(topSize < 0) {
			topSize = 0;
		}
		if(bottomSize < 0) {
			bottomSize = 0;
		}
		this.scale.y = Math.min(1, 1 - topSize - bottomSize);
		this.yRepeat = this.scale.y;
		this.yShift = topSize;
	}

	update() {
		if (this.xShiftSpeed !== 0) {
			this.xShift += this.xShiftSpeed;
			if (this._xShift > 1) {
				this._xShift -= 1;
			} else if (this._xShift < 0) {
				this._xShift += 1;
			}
		}
		if (this.yShiftSpeed !== 0) {
			this.yShift += this.yShiftSpeed;
			if (this._yShift > 1) {
				this._yShift -= 1;
			} else if (this._yShift < 0) {
				this._yShift += 1;
			}
		}

		if (this.xWaveSpeed !== 0) {
			this.xWavePhase += this.xWaveSpeed;
			if (this._xWavePhase > PI_2) {
				this._xWavePhase -= PI_2;
			} else if (this._xWavePhase < 0) {
				this._xWavePhase += PI_2;
			}
		}

		if (this.yWaveSpeed !== 0) {
			this.yWavePhase += this.yWaveSpeed;
			if (this._yWavePhase > PI_2) {
				this._yWavePhase -= PI_2;
			} else if (this._yWavePhase < 0) {
				this._yWavePhase += PI_2;
			}
		}
		super.update();
	}

	updateFilling() {
		let a = this.uvs;
		let i = 0;
		let curxShift, curyShift;
		curyShift = this._yShift;
		let stepsX = this.verticesX - 1;
		let stepsY = this.verticesY - 1;
		let xStep = this._xRepeat / stepsX;
		let yStep = this._yRepeat / stepsY;
		let xWaveStep = this._xWaveStep / stepsX;
		let yWaveStep = this._yWaveStep / stepsY;

		if(this._xWaveAmp !== 0 || this._yWaveAmp !== 0) {
			
			let curYWavePhase = this._yWavePhase;
			for (let y = 0; y <= stepsY; y++) {

				curxShift = this._xShift + Math.sin(curYWavePhase) * this._yWaveAmp;
				let curXWavePhase = this._xWavePhase;
				for (let x = 0; x <= stepsX; x++) {

					a[i++] = curxShift;
					a[i++] = curyShift + Math.sin(curXWavePhase) * this._xWaveAmp;
					curxShift += xStep;
					curXWavePhase += xWaveStep;
				}
				curYWavePhase += yWaveStep;
				curyShift += yStep;
			}
		} else {
			for (let y = 0; y <= stepsY; y++) {
				curxShift = this._xShift;
				for (let x = 0; x <= stepsX; x++) {
					a[i++] = curxShift;
					a[i++] = curyShift;
					curxShift += xStep;
				}
				curyShift += yStep;
			}
		}
		this.multiplyUvs();
	}

	set texture(t) {
		if(super.texture !== t) {
			super.texture = t;
			this.fillUpdated = true;
		}
	}

	get texture() {
		return super.texture;
	}

	get xRepeat() {
		return this._xRepeat;
	}

	set xRepeat(v) {
		if(this._xRepeat !== v) {
			this._xRepeat = v;
			this.fillUpdated = true;
		}
	}

	get xShift() {
		return this._xShift;
	}

	set xShift(v) {
		if (this._xShift !== v) {
			this._xShift = v;
			this.fillUpdated = true;
		}
	}

	get xWaveAmp() {
		return this._xWaveAmp;
	}

	set xWaveAmp(v) {
		if (this._xWaveAmp !== v) {
			this._xWaveAmp = v;
			this.fillUpdated = true;
		}
	}

	get xWaveStep() {
		return this._xWaveStep;
	}

	set xWaveStep(v) {
		if (this._xWaveStep !== v) {
			this._xWaveStep = v;
			this.fillUpdated = true;
		}
	}

	get xWavePhase() {
		return this._xWavePhase;
	}

	set xWavePhase(v) {
		if (this._xWavePhase !== v) {
			this._xWavePhase = v;
			this.fillUpdated = true;
		}
	}

	get yRepeat() {
		return this._yRepeat;
	}

	set yRepeat(v) {
		if (this._yRepeat !== v) {
			this._yRepeat = v;
			this.fillUpdated = true;
		}
	}

	get yShift() {
		return this._yShift;
	}

	set yShift(v) {
		if (this._yShift !== v) {
			this._yShift = v;
			this.fillUpdated = true;
		}
	}

	get yWaveAmp() {
		return this._yWaveAmp;
	}

	set yWaveAmp(v) {
		if (this._yWaveAmp !== v) {
			this._yWaveAmp = v;
			this.fillUpdated = true;
		}
	}

	get yWaveStep() {
		return this._yWaveStep;
	}

	set yWaveStep(v) {
		if (this._yWaveStep !== v) {
			this._yWaveStep = v;
			this.fillUpdated = true;
		}
	}

	get yWavePhase() {
		return this._yWavePhase;
	}

	set yWavePhase(v) {
		if (this._yWavePhase !== v) {
			this._yWavePhase = v;
			this.fillUpdated = true;
		}
	}
}


/// #if EDITOR

Fill.__EDITOR_group = 'Basic';
Fill.__EDITOR_icon = 'tree/fill';
__EDITOR_editableProps(Fill, [
	{
		type: 'splitter',
		title: 'Fill sprite:',
		name: 'fill-sprite'
	},
	{
		name: 'verticesX',
		type: Number,
		default: 2,
		min: 2,
		max: 30,
		step: 1,
		important: true
	},
	{
		name: 'verticesY',
		type: Number,
		default: 2,
		min: 2,
		max: 30,
		step: 1,
		important: true
	},
	{
		name: 'autoCrop', // 99999
		type: Boolean
	},
	{
		name: 'xRepeat',
		type: Number,
		default: 1,
		step: 0.001
	},
	{
		name: 'yRepeat',
		type: Number,
		default: 1,
		step: 0.001
	},
	{
		name: 'xShift',
		type: Number,
		step: 0.0001
	},
	{
		name: 'yShift',
		type: Number,
		step: 0.0001
	},
	{
		name: 'xShiftSpeed',
		type: Number,
		step: 0.00001
	},
	{
		name: 'yShiftSpeed',
		type: Number,
		step: 0.00001
	},
	{
		type: 'splitter',
		title: 'Wave effect:',
		name: 'wave-effect'
	},
	{
		name: 'xWaveAmp',
		step: 0.001,
		type: Number
	},
	{
		name: 'xWaveStep',
		type: Number,
		default: 1,
		step: 0.001,
		visible: o => o.xWaveAmp !== 0
	},
	{
		name: 'xWavePhase',
		type: Number,
		step: 0.001,
		min: 0,
		max: PI_2,
		visible: o => o.xWaveAmp !== 0
	},
	{
		name: 'xWaveSpeed',
		type: Number,
		step: 0.0001,
		visible: o => o.xWaveAmp !== 0
	},
	{
		name: 'yWaveAmp',
		step: 0.001,
		type: Number
	},
	{
		name: 'yWaveStep',
		type: Number,
		default: 1,
		step: 0.001,
		visible: o => o.yWaveAmp !== 0
	},
	{
		name: 'yWavePhase',
		type: Number,
		step: 0.001,
		min: 0,
		max: PI_2,
		visible: o => o.yWaveAmp !== 0
	},
	{
		name: 'yWaveSpeed',
		type: Number,
		step: 0.0001,
		visible: o => o.yWaveAmp !== 0
	}
]);

/// #endif