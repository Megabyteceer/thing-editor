
import type { EditableRect } from 'thing-editor/src/editor/props-editor/editable';
import editable from 'thing-editor/src/editor/props-editor/editable';
import game from 'thing-editor/src/engine/game';
import Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';
import { mouseHandlerGlobal } from 'thing-editor/src/engine/utils/game-interaction';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

let draggingLayer: ScrollLayer | null;
let mouseX_prev = 0;
let mouseY_prev = 0;

const WHEEL_EVENT_OPTIONS =
	/// #if EDITOR
	true;
/*
/// #endif
{ passive: false, capture: true };
//*/
/// #if EDITOR
const DISABLE_XY_TIP = 'ScrollLayer uses it`s x,y to handle scrolling. If you want move ScrollLayer to non zero position, wrap it in to container and move container instead.';
/// #endif

export default class ScrollLayer extends Container {

	constructor() {
		super();
		this.onDown = this.onDown.bind(this);
		this.onWheel = this.onWheel.bind(this);
	}

	callAfterScroll!: null | (() => void);

	autoScrolling = false;

	__virtualScrollX = 0;
	__virtualScrollY = 0;

	scrollToX = 0;
	scrollToY = 0;

	xSpeed = 0;
	ySpeed = 0;

	@editable({ name: 'interactive', default: true, override: true })
	@editable({ name: 'x', override: true, disabled: () => DISABLE_XY_TIP })
	@editable({ name: 'y', override: true, disabled: () => DISABLE_XY_TIP })

	@editable({ type: 'rect', rect_maxX: 0, rect_maxY: 0, rect_minX: 0, rect_minY: 0, afterEdited: validateAreas })
	visibleArea!: EditableRect;

	@editable({ type: 'rect', guideColor: 0xFF4400, rect_maxX: 0, rect_maxY: 0, rect_minX: 0, rect_minY: 0, afterEdited: validateAreas })
	fullArea!: EditableRect;

	@editable({ type: 'data-path', isValueValid: o => (o instanceof Container) })
	mouseHandler = null;

	@editable({ type: 'ref' })
	_mouseHandlerContainer!: Container;

	@editable({ max: 0.99, min: 0, step: 0.01, })
	desktopInertia = 0.8;

	@editable({ max: 0.99, min: 0, step: 0.01, })
	mobileInertia = 0.92;

	@editable()
	bouncingBounds = true;

	init() {
		super.init();
		if (this.mouseHandler) {
			this._mouseHandlerContainer = getValueByPath(this.mouseHandler, this);
			this._mouseHandlerContainer.on('pointerdown', this.onDown);
			/// #if EDITOR
			if (!this._mouseHandlerContainer.interactive) {
				let isInteractiveChildFound = false;
				this._mouseHandlerContainer.forAllChildren((o) => {
					if (!isInteractiveChildFound) {
						isInteractiveChildFound = o.interactive;
					}
				});
				if (!isInteractiveChildFound) {
					game.editor.ui.status.warn('ScrollLayer\'s mouseHandler refers to container which has no interactive children.', 32047, this, 'mouseHandler');
				}
			}
			/// #endif
		} else {
			this._mouseHandlerContainer = null as any;
			(game.pixiApp.view as HTMLCanvasElement).addEventListener('pointerdown', this.onDown);
		}

		document.addEventListener('wheel', this.onWheel, WHEEL_EVENT_OPTIONS);
		this.autoScrolling = false;
		this.xSpeed = 0;
		this.ySpeed = 0;
		this._virtualScrollX = this.x;
		this._virtualScrollY = this.y;
	}

	onWheel(ev: WheelEvent) {
		if (this.autoScrolling) {
			return;
		}

		let d = 0;
		if (this._mouseHandlerContainer) {
			if (this._mouseHandlerContainer.isCanBePressed) {
				let p = game.mouse;
				if (this._mouseHandlerContainer.getBounds().contains(p.x, p.y)) {
					d = ev.deltaY;
					ev.stopPropagation();
					if (ev.cancelable) {
						ev.preventDefault();
					}
				}
			}
		} else {
			if (this.isCanBePressed) {
				d = ev.deltaY;
				ev.stopPropagation();
				if (ev.cancelable) {
					ev.preventDefault();
				}
			}
		}
		if (d) {
			if (ev.deltaMode === 1) {
				d *= 60;
			}
			d = Math.min(60, Math.max(-60, d));
			if (this.isYScrollAvailable) {
				this.ySpeed = -d;
			} else if (this.isXScrollAvailable) {
				this.xSpeed = d;
			}
		}
	}

	onDown(ev: PointerEvent) {
		if (this.worldVisible) {
			mouseHandlerGlobal(ev);

			/// #if EDITOR
			if (draggingLayer) {
				game.editor.ui.status.warn('More than one scroll layer want to be dragged by one mouse handler', 32048);
			}
			/// #endif

			draggingLayer = this;
			mouseX_prev = game.mouse.x;
			mouseY_prev = game.mouse.y;

		}
	}

	static updateGlobal() {
		if (draggingLayer) {
			draggingLayer.updateGlobal();
		}
	}

	updateGlobal() {
		if (game.mouse.click) {
			if (this.fullArea.w > this.visibleArea.w) {
				this.xSpeed = (game.mouse.x - mouseX_prev);
				this._virtualScrollX += this.xSpeed;
			}
			if (this.fullArea.h > this.visibleArea.h) {
				this.ySpeed = (game.mouse.y - mouseY_prev);
				this._virtualScrollY += this.ySpeed;
			}
			mouseX_prev = game.mouse.x;
			mouseY_prev = game.mouse.y;
		}
	}

	onRemove() {
		this.stopDragThisLayer();
		document.removeEventListener('wheel', this.onWheel, WHEEL_EVENT_OPTIONS);

		if (this._mouseHandlerContainer) {
			this._mouseHandlerContainer.removeListener('pointerdown', this.onDown);
		} else {
			(game.pixiApp.view as HTMLCanvasElement).removeEventListener('pointerdown', this.onDown);
		}
		super.onRemove();
	}

	update() {
		if (this.visible) {

			if (draggingLayer !== this) {

				this._virtualScrollX += this.xSpeed;
				this._virtualScrollY += this.ySpeed;
				if (!this.autoScrolling) {
					if (game.isMobile.any) {
						this.xSpeed *= this.mobileInertia;
						this.ySpeed *= this.mobileInertia;
					} else {
						this.xSpeed *= this.desktopInertia;
						this.ySpeed *= this.desktopInertia;
					}
					this.xSpeed = stepTo(this.xSpeed, 0, 0.1);
					this.ySpeed = stepTo(this.ySpeed, 0, 0.1);
				} else {
					this.xSpeed *= 0.98;
					this.ySpeed *= 0.98;
				}
			}

			let v = this.visibleArea;
			let f = this.fullArea;

			if (this.autoScrolling) {
				this._checkScrollToBounds();
				this.xSpeed += (this.scrollToX - this._virtualScrollX) * 0.06;
				this.ySpeed += (this.scrollToY - this._virtualScrollY) * 0.06;
				this.xSpeed *= 0.7;
				this.ySpeed *= 0.7;
				if ((Math.abs(this.scrollToX - this._virtualScrollX) <= 1) && (Math.abs(this.xSpeed) < 0.5) && (Math.abs(this.scrollToY - this._virtualScrollY) <= 1) && (Math.abs(this.ySpeed) < 0.5)) {
					this.xSpeed = 0;
					this.ySpeed = 0;
					if (this.callAfterScroll) {
						this.callAfterScroll();
					}
					this._virtualScrollX = this.scrollToX;
					this._virtualScrollY = this.scrollToY;
					this.callAfterScroll = null;
					this.autoScrolling = false;
				}
			}

			let limitShift = 0;

			if (((v.x + v.w) - this._virtualScrollX) > (f.x + f.w)) {
				limitShift = (((v.x + v.w) - this._virtualScrollX) - (f.x + f.w));
			}
			if ((v.x - this._virtualScrollX - limitShift) < f.x) {
				limitShift = -(f.x - (v.x - this._virtualScrollX));
			}

			if (limitShift !== 0) {
				if (this.bouncingBounds) {
					this.xSpeed *= 0.95;
					this._virtualScrollX = stepTo(this._virtualScrollX, this._virtualScrollX + limitShift, Math.abs(limitShift / 4));
				} else {
					this.xSpeed = 0;
					this._virtualScrollX += limitShift;
				}
			}

			limitShift = 0;
			if (((v.y + v.h) - this._virtualScrollY) > (f.y + f.h)) {
				limitShift = (((v.y + v.h) - this._virtualScrollY) - (f.y + f.h));
			}
			if ((v.y - this._virtualScrollY - limitShift) < f.y) {
				limitShift = -(f.y - (v.y - this._virtualScrollY));
			}

			if (limitShift !== 0) {
				if (this.bouncingBounds) {
					this.ySpeed *= 0.95;
					this._virtualScrollY = stepTo(this._virtualScrollY, this._virtualScrollY + limitShift, Math.abs(limitShift / 4));
				} else {
					this.ySpeed = 0;
					this._virtualScrollY += limitShift;
				}
			}

		} else {
			this.xSpeed = 0;
			this.ySpeed = 0;
		}

		if (!this.visible || !game.mouse.click) {
			this.stopDragThisLayer();
		}
		super.update();
	}

	scrollRight(pow = 16) {
		this.stopDragThisLayer();
		this.xSpeed = -pow;
	}

	scrollDown(pow = 16) {
		this.stopDragThisLayer();
		this.ySpeed = -pow;
	}

	get canScrollUp() {
		return this.y < 0;
	}

	get canScrollDown() {
		return (-this.y + this.visibleArea.h) < this.fullArea.h;
	}

	get relativeScrollY() {
		return -(this.autoScrolling ? this.scrollToY : this._virtualScrollY) / Math.max(1, this.fullArea.h - this.visibleArea.h);
	}

	set relativeScrollY(val) {
		this._virtualScrollY = -val * (this.fullArea.h - this.visibleArea.h);
	}

	get relativeScrollX() {
		return -(this.autoScrolling ? this.scrollToX : this._virtualScrollX) / Math.max(1, this.fullArea.w - this.visibleArea.w);
	}

	set relativeScrollX(val) {
		this._virtualScrollX = -val * (this.fullArea.w - this.visibleArea.w);
	}

	get isXScrollAvailable() {
		return this.visibleArea.w < this.fullArea.w;
	}

	get isYScrollAvailable() {
		return this.visibleArea.h < this.fullArea.h;
	}

	set _virtualScrollX(v) {
		this.__virtualScrollX = v;
		this.x = Math.round(v);
	}

	get _virtualScrollX() {
		return this.__virtualScrollX;
	}

	set _virtualScrollY(v) {
		this.__virtualScrollY = v;
		this.y = Math.round(v);
	}

	get _virtualScrollY() {
		return this.__virtualScrollY;
	}

	_checkScrollToBounds() {
		let v = this.visibleArea;
		let f = this.fullArea;

		if (this.scrollToX > -f.x) {
			this.scrollToX = -f.x;
		} else if (this.scrollToX < -(f.x + f.w - v.w)) {
			this.scrollToX = -(f.x + f.w - v.w);
		}

		if (this.scrollToY > -f.y) {
			this.scrollToY = -f.y;
		} else if (this.scrollToY < -(f.y + f.h - v.h)) {
			this.scrollToY = -(f.y + f.h - v.h);
		}
	}

	stopDragThisLayer() {
		if (draggingLayer === this) {
			draggingLayer = null;
		}
	}

	scrollTo(o: Container, callback?: () => void, instantly = false) {
		if (!o) {
			this.autoScrolling = false;
			this.xSpeed = 0;
			this.ySpeed = 0;
			return;
		}

		if (typeof o === 'string') {
			o = this.getChildByName(o)!;
		}

		this.stopDragThisLayer();
		this.autoScrolling = true;
		this.scrollToX = this.visibleArea.w / 2 - o.x;
		this.scrollToY = this.visibleArea.h / 2 - o.y;

		this._checkScrollToBounds();

		if (instantly) {
			this._virtualScrollX = this.scrollToX;
			this._virtualScrollY = this.scrollToY;
		}
		this.callAfterScroll = callback!;
	}
}

/// #if EDITOR
ScrollLayer.__EDITOR_icon = 'tree/scroll';

function validateAreas() {
	for (const o of game.editor.selection as any as ScrollLayer[]) {
		let w = Math.max(o.visibleArea.w, o.fullArea.w);
		let h = Math.max(o.visibleArea.h, o.fullArea.h);
		if (o.fullArea.w !== w || o.fullArea.h !== h) {
			o.fullArea.w = w;
			o.fullArea.h = h;
			game.editor.refreshPropsEditor();
		}
	}
}
/// #endif
