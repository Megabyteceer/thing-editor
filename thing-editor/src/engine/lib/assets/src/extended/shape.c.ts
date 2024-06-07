import type { Point } from 'pixi.js';
import { Circle, Ellipse, Graphics, Polygon, Rectangle, RoundedRectangle } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable.js';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

enum SHAPE_TYPE {
	RECT = 0,
	ROUND_RECT = 1,
	CIRCLE = 2,
	ELLIPSE = 3,
	POLY = 4,
}

const isShapeHasWidthHeight = (o: Shape) => {
	return o.shape === SHAPE_TYPE.RECT ||
		o.shape === SHAPE_TYPE.ROUND_RECT ||
		o.shape === SHAPE_TYPE.ELLIPSE;
};

const isShapeHasRedius = (o: Shape) => {
	return o.shape === SHAPE_TYPE.ROUND_RECT ||
		o.shape === SHAPE_TYPE.CIRCLE;
};

const DEFAULT_POINTS = [[-30, -30], [30, -10], [-10, 30]];

const shapeTypeSelect = [
	{ name: 'Rect', value: SHAPE_TYPE.RECT },
	{ name: 'Round Rect', value: SHAPE_TYPE.ROUND_RECT },
	{ name: 'Circle', value: SHAPE_TYPE.CIRCLE },
	{ name: 'Ellipse', value: SHAPE_TYPE.ELLIPSE },
	{ name: 'Polygon', value: SHAPE_TYPE.POLY }
];

export default class Shape extends Graphics {

	/// #if EDITOR
	constructor() {
		super();
		this._width = 100;
		this._height = 100;
		this.__pointsUpdate = this.__pointsUpdate.bind(this);
	}
	/// #endif

	protected _shape: SHAPE_TYPE = SHAPE_TYPE.RECT;

	protected __deserialized = false;
	protected _shapeRadius = 10;

	protected _lineColor = 0xFFFFFF;
	protected _fillColor = 0;
	protected _fillAlpha = 1;
	protected _llineAlpha = 1;
	protected _lineWidth = 0;
	protected _lineAlignment = 1;

	protected __pointsUpdateIntervalInitialized = 0;

	@editable({ type: 'ref', visible: (o) => { return o.shape === SHAPE_TYPE.POLY && !o.__nodeExtendData.isPrefabReference; } })
	protected set _shapePoints(v: Point[] | null) {
		this.__shapePoints = v;
		if (v) {
			for (let o of v) {
				Object.freeze(o);
			}
		}
	}

	protected get _shapePoints(): Point[] | null {
		return this.__shapePoints;
	}

	protected __shapePoints: Point[] | null = null;

	init() {
		super.init();
		this._drawThing();
		if (this.isItHitArea && this.parent) {
			this.applyHitAreaToParent();
		}
		this.__deserialized = true;
	}

	protected _drawThing() {
		this.clear();
		if (!this.isItHitArea
			/// #if EDITOR
			|| game.__EDITOR_mode
			/// #endif

		) {
			this.lineStyle(this.shapeLineWidth, this.shapeLineColor, this.shapeLineAlpha, this.shapeLineAlignment);
			this.beginFill(this.shapeFillColor, this.shapeFillAlpha);
			this.drawThing();
			this.endFill();
		}
	}

	drawThing() {
		let points;
		switch (this.shape) {
		case SHAPE_TYPE.ROUND_RECT:
			this.drawRoundedRect(0, 0, this.width, this.height, this.shapeRadius);
			break;
		case SHAPE_TYPE.RECT:
			this.drawRect(0, 0, this.width, this.height);
			break;
		case SHAPE_TYPE.CIRCLE:
			this.drawCircle(0, 0, this.shapeRadius);
			break;
		case SHAPE_TYPE.ELLIPSE:
			this.drawEllipse(0, 0, this.width, this.height);
			break;
		case SHAPE_TYPE.POLY:
			/// #if EDITOR
			if (!this._shapePoints) {
				this._shapePoints = [];
			}
			while (this._shapePoints.length < DEFAULT_POINTS.length) {
				let p = {
					x: DEFAULT_POINTS[this._shapePoints.length][0],
					y: DEFAULT_POINTS[this._shapePoints.length][1]
				};
				this._shapePoints.push(p as Point);
				Object.freeze(p);
			}
			/// #endif
			if (this._shapePoints.length > 2) {
				points = [];
				for (let c of this._shapePoints) {
					points.push(c.x, c.y);
				}
				this.drawPolygon(points);
			}
			break;
		}
	}

	getHitareaShape() {
		switch (this.shape) {
		case SHAPE_TYPE.ROUND_RECT:
			return new RoundedRectangle(this.x, this.y, this.width, this.height, this.shapeRadius);
			break;
		case SHAPE_TYPE.RECT:
			return new Rectangle(this.x, this.y, this.width, this.height);
			break;
		case SHAPE_TYPE.CIRCLE:
			return new Circle(this.x, this.y, this.shapeRadius);
			break;
		case SHAPE_TYPE.ELLIPSE:
			return new Ellipse(this.x, this.y, this.width, this.height);
			break;

		case SHAPE_TYPE.POLY:
			if ((this._shapePoints as Point[]).length > 2) {
				let points = [];
				for (let c of this._shapePoints as Point[]) {
					points.push(c.x + this.x, c.y + this.y);
				}
				return new Polygon(points);
			}
			break;
		}
		return null;
	}

	applyHitAreaToParent() {
		this.parent.hitArea = this.getHitareaShape();
		this.visible = false;
	}

	onRemove() {
		super.onRemove();
		this.clear();
		if (this.isItHitArea && this.parent) {
			this.parent.hitArea = null;
		}
		this.__deserialized = false;
	}

	@editable({ select: shapeTypeSelect, important: true, visible: (o) => !o.__nodeExtendData.isPrefabReference })
	set shape(s: SHAPE_TYPE) {
		this._shape = s;
		if (this.__deserialized) {
			/// #if EDITOR
			if (s === SHAPE_TYPE.POLY) {
				if (!this._shapePoints) {
					this._shapePoints = [];
				}
			} else {
				this._shapePoints = null;
				this.__stopPointsRefreshInterval();

			}
			/// #endif

			this._drawThing();

			/// #if EDITOR
			if (s === SHAPE_TYPE.POLY) {
				this.__startPointRefreshIfSelected();
			}
			/// #endif
		}
	}

	get shape() {
		return this._shape;
	}

	@editable({ visible: isShapeHasWidthHeight, important: true })
	set width(s) {
		this._width = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get width() {
		return this._width;
	}

	@editable({ visible: isShapeHasWidthHeight, important: true })
	set height(s) {
		this._height = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get height() {
		return this._height;
	}

	@editable({ visible: isShapeHasRedius, important: true })
	set shapeRadius(s) {
		this._shapeRadius = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeRadius() {
		return this._shapeRadius;
	}

	@editable({ min: 0, max: 1, step: 0.01, default: 1 })
	set shapeFillAlpha(s) {
		this._fillAlpha = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeFillAlpha() {
		return this._fillAlpha;
	}

	@editable({ type: 'color', visible: (o) => { return o.shapeFillAlpha > 0; } })
	set shapeFillColor(s) {
		this._fillColor = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeFillColor() {
		return this._fillColor;
	}

	@editable({ min: 0 })
	set shapeLineWidth(s) {
		this._lineWidth = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineWidth() {
		return this._lineWidth;
	}

	@editable({ type: 'color', visible: (o) => { return o.shapeLineWidth > 0; } })
	set shapeLineColor(s) {
		this._lineColor = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineColor() {
		return this._lineColor;
	}

	@editable({ min: 0, max: 1, step: 0.01, visible: (o) => { return o.shapeLineWidth > 0; } })
	set shapeLineAlpha(s) {
		this._llineAlpha = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineAlpha() {
		return this._llineAlpha;
	}

	@editable({ min: 0, max: 1, step: 0.01, visible: (o) => { return o.shapeLineWidth > 0; } })
	set shapeLineAlignment(s) {
		this._lineAlignment = s;
		if (this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineAlignment() {
		return this._lineAlignment;
	}

	@editable()
	isItHitArea = false;

	/// #if EDITOR

	__EDITOR_onCreate() {
		this.__deserialized = true;
		this.shape = this._shape;
	}

	__afterDeserialization() {
		this.__deserialized = true;
		this._drawThing();
	}

	__beforeDeserialization() {
		this.__deserialized = false;
	}

	__removePolyPoints() {
		for (let i = this.children.length - 1; i >= 0; i--) {
			let c = this.children[i];
			if (c.name === '___point') {
				c.remove();
			}
		}
	}

	__afterSerialization(data: SerializedObject) {
		if (this._shapePoints && !this.__nodeExtendData.isPrefabReference && this.shape === SHAPE_TYPE.POLY) {
			data.p._shapePoints = this._shapePoints;
		}
	}

	__onSelect() {
		super.__onSelect();
		this.__startPointRefreshIfSelected();
	}

	__onChildSelected() {
		this.__startPointRefreshIfSelected();
	}

	__showPoints() {
		if (this.shape === SHAPE_TYPE.POLY) {
			if (game.__EDITOR_mode) {
				this.__removePolyPoints();
				for (let p of this._shapePoints as Point[]) {
					this.__newPointView(p);
				}
			}
		}
	}

	__beforeDestroy() {
		this.__stopPointsRefreshInterval();
	}

	__stopPointsRefreshInterval() {
		if (this.__pointsUpdateIntervalInitialized) {
			this.__removePolyPoints();
			game.editor.refreshTreeViewAndPropertyEditor();
			clearInterval(this.__pointsUpdateIntervalInitialized);
			this.__pointsUpdateIntervalInitialized = 0;
		}
	}

	__pointsUpdate() {
		let isAnyPointSelected;

		this._shapePoints = [];
		for (let o of this.children) {
			if (o.name === '___point') {
				if (o.__nodeExtendData.isSelected) {
					isAnyPointSelected = true;
				}
				this._shapePoints.push({
					x: o.x,
					y: o.y
				} as Point);
			}
		}

		this._shapePoints.some(i => Object.freeze(i));

		this._drawThing();


		if (this.shape !== SHAPE_TYPE.POLY || !isAnyPointSelected && !this.__nodeExtendData.isSelected) {
			this.__stopPointsRefreshInterval();
		}
	}

	__newPointView(src: Point) {
		let p: Shape = Lib._deserializeObject({ c: 'Shape', p: {} }) as Shape;
		p.name = '___point';
		p.shape = SHAPE_TYPE.RECT;
		p.width = 4;
		p.height = 4;
		p.pivot.x = 2;
		p.pivot.y = 2;
		p.alpha = 0.5;
		p.shapeFillColor = 0xffaa00;
		p.x = src.x;
		p.y = src.y;
		this.addChild(p);
		let extData = p.__nodeExtendData;
		extData.hidePropsEditor = { title: 'Polygon\'s vertex is selected', visibleFields: { x: true, y: true } };
		extData.noSerialize = true;
		return p;
	}

	__startPointRefreshIfSelected() {
		if (game.__EDITOR_mode && !this.__nodeExtendData.isPrefabReference && (this.shape === SHAPE_TYPE.POLY) && (!this.__pointsUpdateIntervalInitialized)) {
			let isAnySelected = this.__nodeExtendData.isSelected;
			if (!isAnySelected) {
				for (let o of this.children) {
					if ((o.name === '___point') && o.__nodeExtendData.isSelected) {
						isAnySelected = true;
						break;
					}
				}
			}

			if (isAnySelected) {
				this.__showPoints();
				this.__pointsUpdateIntervalInitialized = window.setInterval(this.__pointsUpdate, 40);
			}

		}
	}
	/// #endif
}

/// #if EDITOR
Shape.__EDITOR_icon = 'tree/shape';
/// #endif
