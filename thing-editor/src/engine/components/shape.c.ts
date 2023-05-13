import { Circle, Ellipse, Graphics, Point, Polygon, Rectangle, RoundedRectangle } from "pixi.js";
import game from "../game.js";
import Lib from "../lib.js";
import editable from "thing-editor/src/editor/props-editor/editable.js";
import { SerializedObject, SourceMappedConstructor } from "thing-editor/src/editor/env.js";

enum SHAPE_TYPE {
	RECT = 0,
	ROUND_RECT = 1,
	CIRCLE = 2,
	ELLIPSE = 3,
	POLY = 4,
}

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
		this.__pointsUpdate = this.__pointsUpdate.bind(this);
	}
	/// #endif

	@editable()
	isItHitArea = false;

	protected _hitAreaCache: Rectangle | Ellipse | Circle | RoundedRectangle | Polygon | null = null;

	protected _shape: SHAPE_TYPE = SHAPE_TYPE.RECT;

	protected __deserialized = false;
	protected _shapeRadius = 10;

	protected _lineColor = 0xFFFFFF;
	protected _fillColor = 0;
	protected _fillAlpha = 1;
	protected _llineAlpha = 1;
	protected _lineWidth = 0;
	protected _lineAlignment = 1;

	protected __pointsUpdateIntervalInitialized: number | null = null;

	protected __shapePoints: Point[] | null = null;

	init() {
		super.init();
		this._drawThing();
		if(this.isItHitArea && this.parent) {
			this.applyHitAreaToParent();
		}
	}

	protected _drawThing() {
		this.clear();
		if(!this.isItHitArea
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
		switch(this.shape) {
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
				if(!this._shapePoints) {
					this._shapePoints = [];
				}
				while(this._shapePoints.length < DEFAULT_POINTS.length) {
					let p = {
						x: DEFAULT_POINTS[this._shapePoints.length][0],
						y: DEFAULT_POINTS[this._shapePoints.length][1]
					};
					this._shapePoints.push(p as Point);
					Object.freeze(p);
				}
				/// #endif
				if(this._shapePoints.length > 2) {
					points = [];
					for(let c of this._shapePoints) {
						points.push(c.x, c.y);
					}
					this.drawPolygon(points);
				}
				break;
		}
	}

	getHitareaShape() {
		if(!this._hitAreaCache) {
			switch(this.shape) {
				case SHAPE_TYPE.ROUND_RECT:
					this._hitAreaCache = new RoundedRectangle(this.x, this.y, this.width, this.height, this.shapeRadius);
					break;
				case SHAPE_TYPE.RECT:
					this._hitAreaCache = new Rectangle(this.x, this.y, this.width, this.height);
					break;
				case SHAPE_TYPE.CIRCLE:
					this._hitAreaCache = new Circle(this.x, this.y, this.shapeRadius);
					break;
				case SHAPE_TYPE.ELLIPSE:
					this._hitAreaCache = new Ellipse(this.x, this.y, this.width, this.height);
					break;

				case SHAPE_TYPE.POLY:
					if((this._shapePoints as Point[]).length > 2) {
						let points = [];
						for(let c of this._shapePoints as Point[]) {
							points.push(c.x + this.x, c.y + this.y);
						}
						this._hitAreaCache = new Polygon(points);
					}
					break;
			}
		}
		return this._hitAreaCache;
	}

	applyHitAreaToParent() {
		this.parent.hitArea = this.getHitareaShape();
		this.visible = false;
	}

	onRemove() {
		super.onRemove();
		this.clear();
		if(this.isItHitArea && this.parent) {
			this.parent.hitArea = null;
		}
	}

	@editable({ select: shapeTypeSelect, important: true })
	set shape(s: SHAPE_TYPE) {
		this._shape = s;
		if(this.__deserialized) {
			/// #if EDITOR
			if(s === SHAPE_TYPE.POLY) {
				if(!this._shapePoints) {
					this._shapePoints = [];
				}
			} else {
				this._shapePoints = null;
				this.__stopPointsRefreshInterval();

			}
			/// #endif

			this._drawThing();

			/// #if EDITOR
			if(s === SHAPE_TYPE.POLY) {
				this.__startPointRefreshIfSelected();
			}
			/// #endif
		}
	}

	get shape() {
		return this._shape;
	}

	set width(s) {
		this._width = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get width() {
		return this._width;
	}

	set height(s) {
		this._height = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get height() {
		return this._height;
	}

	set shapeRadius(s) {
		this._shapeRadius = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeRadius() {
		return this._shapeRadius;
	}

	set shapeLineColor(s) {
		this._lineColor = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineColor() {
		return this._lineColor;
	}

	set shapeFillColor(s) {
		this._fillColor = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeFillColor() {
		return this._fillColor;
	}

	set shapeFillAlpha(s) {
		this._fillAlpha = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeFillAlpha() {
		return this._fillAlpha;
	}

	set shapeLineAlpha(s) {
		this._llineAlpha = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineAlpha() {
		return this._llineAlpha;
	}

	set shapeLineWidth(s) {
		this._lineWidth = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineWidth() {
		return this._lineWidth;
	}

	set shapeLineAlignment(s) {
		this._lineAlignment = s;
		if(this.__deserialized) {
			this._drawThing();
		}
	}

	get shapeLineAlignment() {
		return this._lineAlignment;
	}

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
		for(let i = this.children.length - 1; i >= 0; i--) {
			let c = this.children[i];
			if(c.name === '___point') {
				c.remove();
			}
		}
	}

	__afterSerialization(data: SerializedObject) {
		if(this._shapePoints) {
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
		if(this.shape === SHAPE_TYPE.POLY) {
			if(game.__EDITOR_mode) {
				this.__removePolyPoints();
				for(let p of this._shapePoints as Point[]) {
					this.__newPointView(p);
				}
			}
		}
	}

	__beforeDestroy() {
		this.__stopPointsRefreshInterval();
	}

	__stopPointsRefreshInterval() {
		if(this.__pointsUpdateIntervalInitialized) {
			this.__removePolyPoints();
			game.editor.refreshTreeViewAndPropertyEditor();
			clearInterval(this.__pointsUpdateIntervalInitialized);
			this.__pointsUpdateIntervalInitialized = null;
		}
	}

	__pointsUpdate() {
		let isAnyPointSelected;

		this._shapePoints = [];
		for(let o of this.children) {
			if(o.name === '___point') {
				if(o.__nodeExtendData.isSelected) {
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


		if(this.shape !== SHAPE_TYPE.POLY || !isAnyPointSelected && !this.__nodeExtendData.isSelected) {
			this.__stopPointsRefreshInterval();
		}
	}

	protected set _shapePoints(v: Point[] | null) {
		this.__shapePoints = v;
		if(v) {
			for(let o of v) {
				Object.freeze(o);
			}
		}
	}

	protected get _shapePoints(): Point[] | null {
		return this.__shapePoints;
	}

	__newPointView(src: Point) {
		let p: Shape = Lib._deserializeObject({ c: "Shape", p: {} }) as Shape;
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
		extData.rotatorLocked = true;
		extData.hidePropsEditor = { title: "Polygon's vertex is selected", visibleFields: { x: true, y: true } };
		extData.noSerialize = true;
		return p;
	}

	__startPointRefreshIfSelected() {
		if(game.__EDITOR_mode && (this.shape === SHAPE_TYPE.POLY) && (!this.__pointsUpdateIntervalInitialized)) {
			let isAnySelected = this.__nodeExtendData.isSelected;
			if(!isAnySelected) {
				for(let o of this.children) {
					if((o.name === '___point') && o.__nodeExtendData.isSelected) {
						isAnySelected = true;
						break;
					}
				}
			}

			if(isAnySelected) {
				this.__showPoints();
				this.__pointsUpdateIntervalInitialized = setInterval(this.__pointsUpdate, 40);
			}

		}
	}
	/// #endif
}

/// #if EDITOR



const DEFAULT_POINTS = [[-30, -30], [30, -10], [-10, 30]];

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 100;
const DEFAULT_RADIUS = 10;


(Shape as any as SourceMappedConstructor).__EDITOR_group = 'Extended';
(Shape as any as SourceMappedConstructor).__EDITOR_icon = 'tree/shape';

/* TODO
__EDITOR_editableProps(Shape, [
,
	{
		name: 'width',
		type: Number,
		default: DEFAULT_WIDTH,
		visible: (o) => {
			return o.shape !== SHAPE_TYPE.CIRCLE && o.shape !== SHAPE_TYPE.POLY;
		},
		important: true
	},
	{
		name: 'height',
		type: Number,
		default: DEFAULT_HEIGHT,
		visible: (o) => {
			return o.shape !== SHAPE_TYPE.CIRCLE && o.shape !== SHAPE_TYPE.POLY;
		},
		important: true
	},
	{
		name: 'shapeRadius',
		type: Number,
		default: DEFAULT_RADIUS,
		visible: (o) => {
			return o.shape === SHAPE_TYPE.ROUND_RECT || o.shape === SHAPE_TYPE.CIRCLE;
		},
		important: true
	},
	{
		name: 'shapeFillAlpha',
		type: Number,
		min: 0,
		max: 1,
		step: 0.01,
		default: 1
	},
	{
		name: 'shapeFillColor',
		basis: 16,
		type: Number,
		max: 0xFFFFFF,
		min: 0,
		visible: (o) => {
			return o.shapeFillAlpha > 0;
		}
	},
	{
		name: 'isItHitArea',
		type: Boolean
	},
	{
		name: 'shapeLineWidth',
		type: Number,
		min: 0
	},
	{
		name: 'shapeLineColor',
		basis: 16,
		type: Number,
		default: 0xFFFFFF,
		min: 0,
		max: 0xFFFFFF,
		visible: (o) => {
			return o.shapeLineWidth > 0;
		}
	},
	{
		name: 'shapeLineAlpha',
		type: Number,
		min: 0,
		max: 1,
		step: 0.01,
		default: 1,
		visible: (o) => {
			return o.shapeLineWidth > 0;
		}
	},
	{
		name: 'shapeLineAlignment',
		type: Number,
		min: 0,
		max: 1,
		step: 0.01,
		default: 1,
		visible: (o) => {
			return o.shapeLineWidth > 0;
		}
	},
	{
		name: '_spriteRect',
		type: 'ref',
		visible: () => {
			return false;
		}
	},
	{
		name: '_shapePoints',
		type: 'ref',
		visible: (o) => {
			return o.shape === SHAPE_TYPE.POLY;
		}
	}
]);
*/

/// #endif