import type { Rectangle } from 'pixi.js';
import { Point, Texture } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import MovieClip from '../basic/movie-clip.c';

const p = new Point();
const p2 = new Point();
const p3 = new Point();

interface PropsToTrack {
	x: number;
	y: number;
	gameW: number;
	gameH: number;
	scaleX: number;
	scaleY: number;
	rotation: number;
}

export default class BackgroundImage extends MovieClip {
    private _clonedTexture: Texture | null = null;
	private _prevProps: PropsToTrack | null = null;
	private _frameCounter: number = 0;


	@editable({ type: 'number', min: 0, step: 1 })
	public frameUpdateInterval: number = 10;

	@editable({ name: 'rotation', override: true, disabled: () => 'Not supported by texture cropping with a frame' })

	@editable({ name: 'pivot.y', override: true, disabled: () => 'Used for cropped texture positioning' })
	@editable({ name: 'pivot.y', override: true, disabled: () => 'Used for cropped texture positioning' })

	init() {
    	super.init();
		this._onPropsChange();
    	this.applySize();
	}

	private get isNeedUVUpdate() {
		if (!this._prevProps) {
			return true;
		}
		const props = this._prevProps;
		return this.texture !== this._clonedTexture
			|| this.x !== props.x
			|| this.y !== props.y
			|| this.width !== props.gameW
			|| this.height !== props.gameH
			|| this.scale.x !== props.scaleX
			|| this.scale.y !== props.scaleY
			|| this.rotation !== props.rotation;
	}

	update() {
		super.update();

		if (this._frameCounter) {
			this._frameCounter--;
			return;
		}

		this._handleTextureCrop();

		this._frameCounter = this.frameUpdateInterval;
	}

	private _handleTextureCrop() {
		if (this.isNeedUVUpdate) {
			this._onPropsChange();
			this.applySize();
		}
	}

	private _onPropsChange () {
		this._cloneTextureIfChanged();
		this._prevProps = {
			x: this.x,
			y: this.y,
			gameW: game.W,
			gameH: game.H,
			scaleX: this.scale.x,
			scaleY: this.scale.y,
			rotation: this.rotation,
		};
	}

	private _cloneTextureIfChanged() {
		if (this.texture !== Texture.EMPTY && this.texture !== this._clonedTexture) {
			this._destroyClonedTexture();
			// Создаем клон текстуры для избежания конфликтов
			this._clonedTexture = new Texture(
				this.texture.baseTexture,
				this.texture.frame.clone()
			);
			this.texture = this._clonedTexture;
		}
	}

	destroy() {
    	this._destroyClonedTexture();
		this._prevProps = null;
    	super.destroy();
	}

	private _destroyClonedTexture() {
    	if (this._clonedTexture) {
    		this._clonedTexture.destroy();
    		this._clonedTexture = null;
    	}
	}

	applySize() {
    	if (!this._clonedTexture || this._clonedTexture === Texture.EMPTY) {
    		return;
    	}

    	const baseTexture = this._clonedTexture.baseTexture;
    	const frame = this._clonedTexture.frame;

    	if (!baseTexture || !frame) {
    		return;
    	}

		const prevFrameHash = this._getFrameHash(frame);

    	this.pivot.set(0, 0);

    	// Вычисляем локальные координаты
    	p2.set(0, 0);
    	this.toLocal(p2, game.stage, p);

    	// Оптимизированный расчет frame
    	frame.x = Math.max(0, Math.floor(baseTexture.width / 2 + p.x));
    	frame.y = Math.max(0, Math.floor(baseTexture.height / 2 + p.y));

    	p2.set(game.W, game.H);
    	this.toLocal(p2, game.stage, p3);

    	frame.width = Math.min(baseTexture.width, Math.ceil(p3.x) + baseTexture.width / 2) - frame.x;
    	frame.height = Math.min(baseTexture.height, Math.ceil(p3.y) + baseTexture.height / 2) - frame.y;

    	// Обновляем pivot
    	this.pivot.x = (baseTexture.width - frame.width) / 2 - frame.x;
    	this.pivot.y = (baseTexture.height - frame.height) / 2 - frame.y;

    	// Выравнивание по четным пикселям
    	this._alignToEvenPixels(frame);

    	// Обновляем UV только если frame действительно изменился
    	if (prevFrameHash !== this._getFrameHash(frame)) {
    		this._clonedTexture.updateUvs();
    	}
	}

	private _getFrameHash(frame: Rectangle): string {
		return `${frame.x}_${frame.y}_${frame.width}_${frame.height}`;
	}

	private _alignToEvenPixels(frame: Rectangle) {
    	if (frame.width & 1) {
    		if (frame.right === this._clonedTexture!.baseTexture.width) {
    			frame.x--;
    			this.pivot.x += 0.5;
    		}
    		frame.width++;
    	}
    	if (frame.height & 1) {
    		if (frame.bottom === this._clonedTexture!.baseTexture.height) {
    			frame.y--;
    			this.pivot.y += 0.5;
    		}
    		frame.height++;
    	}
	}


	/// #if EDITOR
	__beforeSerialization(): void {
    	if (super.__beforeSerialization) super.__beforeSerialization();

    	if (game.__EDITOR_mode) {
    		this._handleTextureCrop();
    	}
	}
	__afterDeserialization() {
    	super.__afterDeserialization();
    	if (game.__EDITOR_mode) {
    		setTimeout(() => {
    			this._handleTextureCrop();
    		}, 10);
    	}
	}


	static __EDITOR_tip = '<b>BackgroundImage</b> - optimizes rendering by cropping the texture to match the screen size, reducing fill rate and rendering overhead to enhance performance.<br>It is not recommended to use this component with animations affecting position/scale/rotation or frame-by-frame animations, as it may lead to performance degradation. Use the <b>frameUpdateInterval</b> property in the editor to control how frequently the texture is updated. You can freely adjust properties like <b>alpha</b> and <b>tint</b> without impacting performance.';
	/// #endif
}
