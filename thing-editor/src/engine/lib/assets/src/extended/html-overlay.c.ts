
import type { Renderer } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import ScrollLayer from 'thing-editor/src/engine/lib/assets/src/extended/scroll-layer.c';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

let _canvasBoundsCache: DOMRect | null = null;
let canvasScale = 1;
function recalcCanvasBounds() {
	if (!_canvasBoundsCache) {
		_canvasBoundsCache = game.pixiApp.view.getBoundingClientRect!() as DOMRect;
		canvasScale = _canvasBoundsCache.width / game.W;
	}
}

export default class HTMLOverlay extends ScrollLayer {


	_htmlContent = '';
	_isHtmlContentInvalidated = false;
	_htmlDiv: null | HTMLDivElement = null;
	currentHtmlScale = 0;
	currentHtmlOpacity = 0;
	_scripts: HTMLScriptElement[] = [];
	_overlayInterval = 0;


	@editable({ multiline: true })
	get innerHTML() {
		return this._htmlContent;
	}

	set innerHTML(v) {
		if (this._htmlContent !== v) {
			this._isHtmlContentInvalidated = !!this._htmlDiv;
			this._htmlContent = v;
		}
	}

	@editable({ arrayProperty: true, type: 'string', multiline: true })
	jsScripts: string[] = [];

	@editable()
	handleScroll = true;

	@editable()
	zIndexHTML = 10000;

	@editable()
	className = '';

	@editable({ min: 0.0001, max: 1, step: 0.0001 })
	fadeSpeed = 0.2;

	@editable({ name: 'bouncingBounds', override: true, type: 'boolean', default: false, visible: () => false })

	latestTime = 0;

	init() {
		this.bouncingBounds = false;
		super.init();
		this.currentHtmlScale = 0;
		this.currentHtmlOpacity = 0;
		this.latestTime = 0;
		this.interactive = true;
		this._overlayIntervalUpdate = this._overlayIntervalUpdate.bind(this);
		assert(!this._htmlDiv, 'previous this._htmlDiv instance was not removed properly');
		this._scripts = [];
	}

	onRemove() {
		super.onRemove();
		this._releaseHtmlDiv();
	}

	update() {
		_canvasBoundsCache = null;
		recalcCanvasBounds();
		if (this.handleScroll && this._htmlDiv) {
			if (this._htmlDiv.scrollHeight > this._htmlDiv.clientHeight) {
				this.fullArea.h = Math.max(this.visibleArea.h, Math.floor(this._htmlDiv.scrollHeight / canvasScale - 1));
			} else {
				this.fullArea.h = this.visibleArea.h;
			}
		}

		super.update();
		this.latestTime = game.time;

		if (this.handleScroll && this._htmlDiv) {
			this._htmlDiv.scrollTop = -this.y * canvasScale;
			this.y = -Math.round(this._htmlDiv.scrollTop / canvasScale);
		}
		this._updateHtmlOpacity();
	}

	_updateHtmlOpacity() {
		let isVisible = this.worldVisible && this._htmlContent && this.isCanBePressed && Math.abs(this.worldTransform.a) > 0.1 && !this._isHtmlContentInvalidated;
		let htmlTargetOpacity = isVisible ? this.worldAlpha : 0;
		this.currentHtmlOpacity = stepTo(this.currentHtmlOpacity, htmlTargetOpacity, this.fadeSpeed);
	}

	_overlayIntervalUpdate() {
		if ((game.time - this.latestTime) > 1) {
			this._updateHtmlOpacity();
		}
		if (!this.worldVisible) {
			this._releaseHtmlDiv();
		}
	}

	_releaseHtmlDiv() {
		if (this._htmlDiv) {
			this._htmlDiv.remove();
			this._htmlDiv = null;
			if (this._overlayInterval) {
				clearInterval(this._overlayInterval);
				this._overlayInterval = 0;
			}
			this._isHtmlContentInvalidated = false;
			this.currentHtmlScale = 0;
			this.currentHtmlOpacity = 0;
		}

		for (let i = 0; i < this._scripts?.length; i++) {
			this._scripts[i].remove();
		}

		this._scripts = [];
	}

	render(renderer: Renderer) {
		this._renderHtmlContainer();
		super.render(renderer);
	}

	_renderHtmlContainer() {

		if (this.currentHtmlOpacity > 0.001
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			if (!this._htmlDiv) {
				this._htmlDiv = document.createElement('div');
				this._htmlDiv.style.position = 'fixed';
				this._htmlDiv.innerHTML = this._htmlContent;
				this._htmlDiv.style.overflow = 'hidden';
				this._htmlDiv.style.zIndex = this.zIndexHTML.toString();
				this._htmlDiv.style.transformOrigin = '0 0';
				this._applyClassName();
				if (this.handleScroll) {
					this._htmlDiv.style.pointerEvents = 'none';
				}

				if (this.jsScripts) {
					for (let i = 0; i < this.jsScripts.length; i++) {
						let script = this.jsScripts[i];
						let scriptElement = document.createElement('script');
						scriptElement.textContent = script;

						this._scripts.push(scriptElement);
					}
				}

				document.body.appendChild(this._htmlDiv);

				for (let i = 0; i < this._scripts.length; i++) {
					document.body.appendChild(this._scripts[i]);
				}
				this._isHtmlContentInvalidated = false;
				this._overlayInterval = window.setInterval(this._overlayIntervalUpdate, 1000 / 60);
			}
			this._htmlDiv.style.opacity = this.currentHtmlOpacity.toString();
			_canvasBoundsCache = null;

			recalcCanvasBounds();

			this._htmlDiv.style.left = (_canvasBoundsCache!.left + Math.round(this.parent.worldTransform.tx) * canvasScale / game.stage.scale.x) + 'px';


			this._htmlDiv.style.top = (_canvasBoundsCache!.top + Math.round(this.parent.worldTransform.ty) * canvasScale / game.stage.scale.x) + 'px';


			this._htmlDiv.style.width = (this.visibleArea.w * canvasScale) + 'px';

			this._htmlDiv.style.height = (this.visibleArea.h * canvasScale) + 'px';

			if (Math.abs(this.currentHtmlScale - this.worldTransform.a) > 0.001) {
				this.currentHtmlScale = this.worldTransform.a;
				this._htmlDiv.style.transform = 'scale(' + (this.currentHtmlScale / game.stage.scale.x).toFixed(3) + ')';
			}
		} else {
			this._releaseHtmlDiv();
		}
	}

	_onRenderResize() {
		this._applyClassName();
	}

	_applyClassName() {
		if (this._htmlDiv) {
			this._htmlDiv.className = this.className ? (this.className + (game.isPortrait ? ' portrait-' : ' landscape-') + this.className) : '';
		}
	}
}
