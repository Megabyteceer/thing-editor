import { Mesh, MeshMaterial, PlaneGeometry, Program, Texture, WRAP_MODES } from 'pixi.js';
import type { EditablePropertyDescRaw } from 'thing-editor/src/editor/props-editor/editable';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import Lib from 'thing-editor/src/engine/lib';

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


/// #if EDITOR
const isWrapDisabled = (o: Fill) => {
	if (!o.image) {
		return 'image property is not set.';
	}

	if (Lib.__isSystemTexture(o.texture, o.image)) {
		return 'System image ' + o.image + ' can not has wrapping mode.';
	}

	if (!o.texture.baseTexture.isPowerOfTwo) {
		return 'Texture should have size power of two (32, 64, 128, 256...) to be wrapped.';
	}
};

const TEXTURE_WRAP_MODE_DESC: EditablePropertyDescRaw = {
	notSerializable: true,
	select: [
		{ name: 'CLAMP', value: WRAP_MODES.CLAMP },
		{ name: 'REPEAT', value: WRAP_MODES.REPEAT },
		{ name: 'MIRRORED_REPEAT', value: WRAP_MODES.MIRRORED_REPEAT }
	],
	disabled: isWrapDisabled as any
};

/// #endif

export default class Fill extends Mesh {

	_verticesX = 2;
	@editable({ min: 2, max: 30, important: true })
	set verticesX(v) {
		if (this._verticesX !== v) {
			this._verticesX = v;
			this.meshResized = true;
		}
	}

	get verticesX() {
		return this._verticesX;
	}

	_verticesY = 2;
	@editable({ min: 2, max: 30, important: true })
	set verticesY(v) {
		if (this._verticesY !== v) {
			this._verticesY = v;
			this.meshResized = true;
		}
	}

	get verticesY() {
		return this._verticesY;
	}

	_xRepeat = 1;
	@editable({ step: 0.001 })
	get xRepeat() {
		return this._xRepeat;
	}

	set xRepeat(v) {
		if (this._xRepeat !== v) {
			this._xRepeat = v;
			this.fillUpdated = true;
		}
	}

	_yRepeat = 1;
	@editable({ step: 0.001 })
	get yRepeat() {
		return this._yRepeat;
	}

	set yRepeat(v) {
		if (this._yRepeat !== v) {
			this._yRepeat = v;
			this.fillUpdated = true;
		}
	}

	_xShift = 0;
	@editable({ step: 0.0001 })
	get xShift() {
		return this._xShift;
	}

	set xShift(v) {
		if (this._xShift !== v) {
			this._xShift = v;
			this.fillUpdated = true;
		}
	}

	_yShift = 0;
	@editable({ step: 0.0001 })
	get yShift() {
		return this._yShift;
	}

	set yShift(v) {
		if (this._yShift !== v) {
			this._yShift = v;
			this.fillUpdated = true;
		}
	}

	@editable({ step: 0.0001 })
	xShiftSpeed = 0;

	@editable({ step: 0.0001 })
	yShiftSpeed = 0;

	/// #if EDITOR
	@editable(TEXTURE_WRAP_MODE_DESC)
	set TEXTURE_WRAP_MODE(v: number) {
		if (this.texture) {
			let bits = 0;
			if (v === WRAP_MODES.REPEAT) {
				bits = 8;
			} else if (v === WRAP_MODES.MIRRORED_REPEAT) {
				bits = 16;
			}
			editorUtils.__setTextureSettingsBits(this.image, bits, 24);
		}
	}

	get TEXTURE_WRAP_MODE() {
		return this.texture ? this.texture.baseTexture.wrapMode : WRAP_MODES.CLAMP;
	}
	/// #endif

	_xWaveAmp = 0;
	@editable({ step: 0.001 })
	@editable({ type: 'splitter', title: 'Wave effect:', name: 'wave-effect' })
	get xWaveAmp() {
		return this._xWaveAmp;
	}

	set xWaveAmp(v) {
		if (this._xWaveAmp !== v) {
			this._xWaveAmp = v;
			this.fillUpdated = true;
		}
	}

	_xWaveStep = 1;
	@editable({ step: 0.001, visible: o => o.xWaveAmp !== 0 })
	get xWaveStep() {
		return this._xWaveStep;
	}

	set xWaveStep(v) {
		if (this._xWaveStep !== v) {
			this._xWaveStep = v;
			this.fillUpdated = true;
		}
	}

	_xWavePhase = 0;
	@editable({ step: 0.001, min: 0, max: PI_2, visible: o => o.xWaveAmp !== 0 })
	get xWavePhase() {
		return this._xWavePhase;
	}

	set xWavePhase(v) {
		if (this._xWavePhase !== v) {
			this._xWavePhase = v;
			this.fillUpdated = true;
		}
	}

	@editable({ step: 0.0001, visible: o => o.xWaveAmp !== 0 })
	xWaveSpeed = 0;

	_yWaveAmp = 0;
	@editable({ step: 0.001 })
	get yWaveAmp() {
		return this._yWaveAmp;
	}

	set yWaveAmp(v) {
		if (this._yWaveAmp !== v) {
			this._yWaveAmp = v;
			this.fillUpdated = true;
		}
	}

	_yWaveStep = 1;
	@editable({ step: 0.001, visible: o => o.yWaveAmp !== 0 })
	get yWaveStep() {
		return this._yWaveStep;
	}

	set yWaveStep(v) {
		if (this._yWaveStep !== v) {
			this._yWaveStep = v;
			this.fillUpdated = true;
		}
	}

	_yWavePhase = 0;
	@editable({ step: 0.001, min: 0, max: PI_2, visible: o => o.yWaveAmp !== 0 })
	get yWavePhase() {
		return this._yWavePhase;
	}

	set yWavePhase(v) {
		if (this._yWavePhase !== v) {
			this._yWavePhase = v;
			this.fillUpdated = true;
		}
	}

	@editable({ step: 0.0001, visible: o => o.yWaveAmp !== 0 })
	yWaveSpeed = 0;

	transparencyUpdated = false;
	_transparentTop = false;

	@editable()
	@editable({ type: 'splitter', title: 'Transparency:', name: 'Transparency' })
	set transparentTop(v) {
		if (this._transparentTop !== v) {
			this._transparentTop = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentTop() {
		return this._transparentTop;
	}

	_transparentBottom = false;
	@editable()
	set transparentBottom(v) {
		if (this._transparentBottom !== v) {
			this._transparentBottom = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentBottom() {
		return this._transparentBottom;
	}

	_transparentLeft = false;
	@editable()
	set transparentLeft(v) {
		if (this._transparentLeft !== v) {
			this._transparentLeft = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentLeft() {
		return this._transparentLeft;
	}

	_transparentRight = false;
	@editable()
	set transparentRight(v) {
		if (this._transparentRight !== v) {
			this._transparentRight = v;
			this.transparencyUpdated = true;
		}
	}

	get transparentRight() {
		return this._transparentRight;
	}


	constructor() {
		super(new PlaneGeometry(2, 2, 2, 2), new MeshMaterial(Texture.WHITE, {
			program: Program.from(vertexSrc, fragmentSrc)
		}));
		this.geometry.addAttribute('aColor',
			[0, 0, 1, 1], 1);
	}

	_applied_verticesX = 0;
	_applied_verticesY = 0;
	fillUpdated = false;
	meshResized = false;

	refreshSize() {
		let g = this.geometry as PlaneGeometry;
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

	cropLeftRight(leftSize: number, rightSize: number) {
		let textureW = this.texture.width;
		leftSize /= textureW;
		rightSize /= textureW;
		if (leftSize < 0) {
			leftSize = 0;
		}
		if (rightSize < 0) {
			rightSize = 0;
		}
		this.scale.x = Math.min(1, 1 - leftSize - rightSize);
		this.xRepeat = this.scale.x;
		this.xShift = leftSize;
	}

	cropTopBottom(topSize: number, bottomSize: number) {
		let textureH = this.texture.height;
		topSize /= textureH;
		bottomSize /= textureH;
		if (topSize < 0) {
			topSize = 0;
		}
		if (bottomSize < 0) {
			bottomSize = 0;
		}
		this.scale.y = Math.min(1, 1 - topSize - bottomSize);
		this.yRepeat = this.scale.y;
		this.yShift = topSize;
	}

	update() {
		if (this.xShiftSpeed !== 0) {
			this.xShift += this.xShiftSpeed;
			if (this._xShift > 2) {
				this._xShift -= 2;
			} else if (this._xShift < -2) {
				this._xShift += 2;
			}
		}
		if (this.yShiftSpeed !== 0) {
			this.yShift += this.yShiftSpeed;
			if (this._yShift > 2) {
				this._yShift -= 2;
			} else if (this._yShift < -2) {
				this._yShift += 2;
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

	set texture(v) {
		if (v !== super.texture) {

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

	render(renderer: any) {
		this.validateFill();
		super.render(renderer);
	}

	_renderCanvas(renderer: any) {
		this.validateFill();
		//@ts-ignore
		super._renderCanvas(renderer);
	}

	validateFill() {
		if (this.meshResized) {
			this.refreshSize();
			this.meshResized = false;
		}
		if (this.fillUpdated) {
			this.updateFilling();
			this.fillUpdated = false;
		}
		if (this.transparencyUpdated) {
			this.updateTransparency();
		}
	}

	calculateVertices() {
		if (this.meshResized) {
			this.refreshSize();
			this.meshResized = false;
		}
		super.calculateVertices();
	}

	updateTransparency() {
		let len = this.verticesX * this.verticesY;

		let buffer = this.geometry.buffers[3];

		if (buffer.data.length !== len) {
			buffer.data = new Float32Array(len);
		}
		let a = buffer.data;

		for (let i = 0; i < len; i++) {
			a[i] = 1;
		}

		if (this.transparentTop) {
			for (let i = this.verticesX - 1; i >= 0; i--) {
				a[i] = 0;
			}
		}

		if (this.transparentBottom) {
			for (let i = len - this.verticesX; i < len; i++) {
				a[i] = 0;
			}
		}

		if (this.transparentLeft) {
			for (let i = 0; i < len; i += this.verticesX) {
				a[i] = 0;
			}
		}

		if (this.transparentRight) {
			for (let i = this.verticesX - 1; i < len; i += this.verticesX) {
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

		if (this._xWaveAmp !== 0 || this._yWaveAmp !== 0) {

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
		this.uvBuffer.update();
	}
}

/// #if EDITOR
Fill.__EDITOR_icon = 'tree/fill';
/// #endif
