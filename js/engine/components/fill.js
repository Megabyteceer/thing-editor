import game from "../game.js";

const PI_2 = Math.PI * 2;

const vertexSrc = `

	precision mediump float;

	attribute vec2 aVertexPosition;
	attribute float aColor;
	attribute vec2 aTextureCoord;

	uniform mat3 translationMatrix;
	uniform mat3 projectionMatrix;
	uniform vec4 uColor;

	varying vec2 vUvs;
	varying vec4 vColor;

	void main() {

	vUvs = aTextureCoord;
	vColor = uColor * aColor;
	gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

}`;

const fragmentSrc = `

	precision mediump float;

	varying vec4 vColor;
	varying vec2 vUvs;

	uniform sampler2D uSampler;

	void main() {

	gl_FragColor = texture2D(uSampler, vUvs) * vColor;
}`;

export default class Fill extends PIXI.Mesh {

	constructor(material) {

		if(!material) {
			material = new PIXI.MeshMaterial(PIXI.Texture.WHITE, {
				program: PIXI.Program.from(vertexSrc, fragmentSrc)
			});
		}

		super(new PIXI.PlaneGeometry(2, 2, 2, 2), material);
		this.geometry.addAttribute('aColor',
			[0, 0, 1, 1], 1);
	}

	refreshSize() {
		let g = this.geometry;
		g.segWidth = this.verticesX;
		g.segHeight = this.verticesY;

		g.width = this.texture.width;
		g.height = this.texture.height;
		g.build();
		this._applied_verticesX = this.verticesX;
		this._applied_verticesY = this.verticesY;
		this.updateFilling();
		this.fillUpdated = false;
		this.updateTransparency();
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
		if(this.xShiftSpeed !== 0) {
			this.xShift += this.xShiftSpeed;
			if(this._xShift > 2) {
				this._xShift -= 2;
			} else if(this._xShift < -2) {
				this._xShift += 2;
			}
		}
		if(this.yShiftSpeed !== 0) {
			this.yShift += this.yShiftSpeed;
			if(this._yShift > 2) {
				this._yShift -= 2;
			} else if(this._yShift < -2) {
				this._yShift += 2;
			}
		}

		if(this.xWaveSpeed !== 0) {
			this.xWavePhase += this.xWaveSpeed;
			if(this._xWavePhase > PI_2) {
				this._xWavePhase -= PI_2;
			} else if(this._xWavePhase < 0) {
				this._xWavePhase += PI_2;
			}
		}

		if(this.yWaveSpeed !== 0) {
			this.yWavePhase += this.yWaveSpeed;
			if(this._yWavePhase > PI_2) {
				this._yWavePhase -= PI_2;
			} else if(this._yWavePhase < 0) {
				this._yWavePhase += PI_2;
			}
		}
		super.update();
	}

	set texture(v) {
		if(v !== super.texture) {

			this.meshResized = this.meshResized ||
				/// #if EDITOR
				!super.texture.valid ||
				/// #endif
				(super.texture.width !== v.width || super.texture.height !== v.height);

			super.texture = v;
		}
	}

	get texture() {
		return super.texture;
	}

	render(renderer) {
		this.validateFill();
		super.render(renderer);
	}

	_renderCanvas(renderer) {
		this.validateFill();
		super._renderCanvas(renderer);
	}

	validateFill() {
		if(this.meshResized) {
			this.refreshSize();
			this.meshResized = false;
		}
		if(this.fillUpdated) {
			this.updateFilling();
			this.fillUpdated = false;
		}
		if(this.transparencyUpdated) {
			this.updateTransparency();
		}
	}

	calculateVertices() {
		if(this.meshResized) {
			this.refreshSize();
			this.meshResized = false;
		}
		super.calculateVertices();
	}

	set transparentTop(v) {
		if(this._transparentTop !== v) {
			this._transparentTop = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentTop() {
		return this._transparentTop;
	}

	set transparentBottom(v) {
		if(this._transparentBottom !== v) {
			this._transparentBottom = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentBottom() {
		return this._transparentBottom;
	}

	set transparentLeft(v) {
		if(this._transparentLeft !== v) {
			this._transparentLeft = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentLeft() {
		return this._transparentLeft;
	}

	set transparentRight(v) {
		if(this._transparentRight !== v) {
			this._transparentRight = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentRight() {
		return this._transparentRight;
	}

	set alpha(v) {
		if(super.alpha !== v) {
			this.transparencyUpdated = true;
			super.alpha = v;
		}
	}

	get alpha() {
		return super.alpha;
	}

	set tintR(v) {
		if(super.tintR !== v) {
			this.transparencyUpdated = true;
			super.tintR = v;
		}
	}

	get tintR() {
		return super.tintR;
	}

	set verticesX(v) {
		if(this._verticesX !== v) {
			this._verticesX = v;
			this.meshResized = true;
		}
	}

	get verticesX() {
		return this._verticesX;
	}

	set verticesY(v) {
		if(this._verticesY !== v) {
			this._verticesY = v;
			this.meshResized = true;
		}
	}

	get verticesY() {
		return this._verticesY;
	}

	updateTransparency() {
		let len = this.verticesX * this.verticesY;

		let buffer = this.geometry.buffers[3];

		if(buffer.data.length !== len) {
			buffer.data = new Float32Array(len);
		}
		let a = buffer.data;

		for(let i = 0; i < len; i++) {
			a[i] = 1;
		}

		if(this.transparentTop) {
			for(let i = this.verticesX - 1; i >= 0; i--) {
				a[i] = 0;
			}
		}

		if(this.transparentBottom) {
			for(let i = len - this.verticesX; i < len; i++) {
				a[i] = 0;
			}
		}

		if(this.transparentLeft) {
			for(let i = 0; i < len; i += this.verticesX) {
				a[i] = 0;
			}
		}

		if(this.transparentRight) {
			for(let i = this.verticesX - 1; i < len; i += this.verticesX) {
				a[i] = 0;
			}
		}

		buffer.update();
		this.transparencyUpdated = false;
	}

	updateFilling() {
		let a = this.uvBuffer.data;
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
			for(let y = 0; y <= stepsY; y++) {

				curxShift = this._xShift + Math.sin(curYWavePhase) * this._yWaveAmp;
				let curXWavePhase = this._xWavePhase;
				for(let x = 0; x <= stepsX; x++) {

					a[i++] = curxShift;
					a[i++] = curyShift + Math.sin(curXWavePhase) * this._xWaveAmp;
					curxShift += xStep;
					curXWavePhase += xWaveStep;
				}
				curYWavePhase += yWaveStep;
				curyShift += yStep;
			}
		} else {
			for(let y = 0; y <= stepsY; y++) {
				curxShift = this._xShift;
				for(let x = 0; x <= stepsX; x++) {
					a[i++] = curxShift;
					a[i++] = curyShift;
					curxShift += xStep;
				}
				curyShift += yStep;
			}
		}
		this.uvBuffer.update();
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
		if(this._xShift !== v) {
			this._xShift = v;
			this.fillUpdated = true;
		}
	}

	get xWaveAmp() {
		return this._xWaveAmp;
	}

	set xWaveAmp(v) {
		if(this._xWaveAmp !== v) {
			this._xWaveAmp = v;
			this.fillUpdated = true;
		}
	}

	get xWaveStep() {
		return this._xWaveStep;
	}

	set xWaveStep(v) {
		if(this._xWaveStep !== v) {
			this._xWaveStep = v;
			this.fillUpdated = true;
		}
	}

	get xWavePhase() {
		return this._xWavePhase;
	}

	set xWavePhase(v) {
		if(this._xWavePhase !== v) {
			this._xWavePhase = v;
			this.fillUpdated = true;
		}
	}

	get yRepeat() {
		return this._yRepeat;
	}

	set yRepeat(v) {
		if(this._yRepeat !== v) {
			this._yRepeat = v;
			this.fillUpdated = true;
		}
	}

	get yShift() {
		return this._yShift;
	}

	set yShift(v) {
		if(this._yShift !== v) {
			this._yShift = v;
			this.fillUpdated = true;
		}
	}

	get yWaveAmp() {
		return this._yWaveAmp;
	}

	set yWaveAmp(v) {
		if(this._yWaveAmp !== v) {
			this._yWaveAmp = v;
			this.fillUpdated = true;
		}
	}

	get yWaveStep() {
		return this._yWaveStep;
	}

	set yWaveStep(v) {
		if(this._yWaveStep !== v) {
			this._yWaveStep = v;
			this.fillUpdated = true;
		}
	}

	get yWavePhase() {
		return this._yWavePhase;
	}

	set yWavePhase(v) {
		if(this._yWavePhase !== v) {
			this._yWavePhase = v;
			this.fillUpdated = true;
		}
	}

	/// #if EDITOR
	set TEXTURE_WRAP_MODE(v) {
		if(this.texture) {
			let bits = 0;
			if(v === PIXI.WRAP_MODES.REPEAT) {
				bits = 8;
			} else if(v === PIXI.WRAP_MODES.MIRRORED_REPEAT) {
				bits = 16;
			}
			game.__setTextureSettingsBits(this.image, bits, 24);
		}
	}

	get TEXTURE_WRAP_MODE() {
		return this.texture ? this.texture.baseTexture.wrapMode : PIXI.WRAP_MODES.CLAMP;
	}

	/// #endif
}


/// #if EDITOR

const isWrapDisabled = (o) => {
	return !o.image || o.image === 'EMPTY' || o.image === "WHITE" || !o.texture.baseTexture.isPowerOfTwo;
};

Fill.__EDITOR_group = 'Basic';
Fill.__EDITOR_icon = 'tree/fill';
__EDITOR_editableProps(Fill, [{
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
	name: 'TEXTURE_WRAP_MODE',
	type: Number,
	notSerializable: true,
	tip: () => {
		if(isWrapDisabled(editor.selection[0])) {
			return `WrapMode is disabled for textures with sizes not equal to <b>power of two (2, 4, 8, 16, 32, 64...)</b> <a target="_blank" href="https://github.com/Megabyteceer/thing-editor/wiki/editor.Textures#wrapping">Read mode...</a>`;
		}
	},
	select: [
		{name: 'CLAMP', value: PIXI.WRAP_MODES.CLAMP},
		{name: 'REPEAT', value: PIXI.WRAP_MODES.REPEAT},
		{name: 'MIRRORED_REPEAT', value: PIXI.WRAP_MODES.MIRRORED_REPEAT}
	],
	disabled: isWrapDisabled
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
},
{
	type: 'splitter',
	title: 'Transparency:',
	name: 'Transparency'
},
{
	name: 'transparentTop',
	type: Boolean
},
{
	name: 'transparentBottom',
	type: Boolean
},
{
	name: 'transparentLeft',
	type: Boolean
},
{
	name: 'transparentRight',
	type: Boolean
}
]);

/** @type number */
Fill.prototype.verticesX;
/** @type number */
Fill.prototype.verticesY;
/** @type number */
Fill.prototype.xRepeat;
/** @type number */
Fill.prototype.yRepeat;
/** @type number */
Fill.prototype.xShift;
/** @type number */
Fill.prototype.yShift;
/** @type number */
Fill.prototype.xShiftSpeed;
/** @type number */
Fill.prototype.yShiftSpeed;
/** @type number */
Fill.prototype.xWaveAmp;
/** @type number */
Fill.prototype.xWaveStep;
/** @type number */
Fill.prototype.xWavePhase;
/** @type number */
Fill.prototype.xWaveSpeed;
/** @type number */
Fill.prototype.yWaveAmp;
/** @type number */
Fill.prototype.yWaveStep;
/** @type number */
Fill.prototype.yWavePhase;
/** @type number */
Fill.prototype.yWaveSpeed;
/** @type Boolean */
Fill.prototype.transparentTop;
/** @type Boolean */
Fill.prototype.transparentBottom;
/** @type Boolean */
Fill.prototype.transparentLeft;
/** @type Boolean */
Fill.prototype.transparentRight;

/// #endif