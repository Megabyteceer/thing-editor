export default PIXI.Text;

Object.defineProperties(PIXI.Text.prototype, {
	image: { //remove sprite texture property
		get: function () {
		},
		set: function () {
		}
	},
	'style.align': {
		get: function () {
			return this.style.align;
		},
		set: function (val) {
			this.style.align = val;
			switch(val) {
				case 'center':
					this.anchor.set(0.5, 0);
					break;
				case 'left':
					this.anchor.set(0, 0);
					break;
				case 'right':
					this.anchor.set(1, 0);
					break;
			}
		}, configurable: true
	},
	'style.fill': {
		get: function () {
			return this.style.fill;
		},
		set: function (val) {
			this.style.fill = val;
		}, configurable: true
	},
	'style.fontFamily': {
		get: function () {
			return this.style.fontFamily;
		},
		set: function (val) {
			this.style.fontFamily = val;
		}, configurable: true
	},
	'style.fontWeight': {
		get: function () {
			return this.style.fontWeight;
		},
		set: function (val) {
			this.style.fontWeight = val;
		}, configurable: true
	},
	'style.fontSize': {
		get: function () {
			return this.style.fontSize;
		},
		set: function (val) {
			this.style.fontSize = val;
		}, configurable: true
	},
	'style.leading': {
		get: function () {
			return this.style.leading;
		},
		set: function (val) {
			this.style.leading = val;
		}, configurable: true
	},
	'style.letterSpacing': {
		get: function () {
			return this.style.letterSpacing;
		},
		set: function (val) {
			this.style.letterSpacing = val;
		}, configurable: true
	},
	'style.stroke': {
		get: function () {
			return this.style.stroke;
		},
		set: function (val) {
			this.style.stroke = val;
		}, configurable: true
	},
	'style.strokeThickness': {
		get: function () {
			return this.style.strokeThickness;
		},
		set: function (val) {
			this.style.strokeThickness = val;
		}, configurable: true
	}
});

/// #if EDITOR

PIXI.Text.EDITOR_icon = 'tree/text';
PIXI.Text.EDITOR_group = 'Basic';
PIXI.Text.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Text:',
		name: 'text-props'
	},
	{
		name: 'text',
		type: String,
		parser: (v) => {
			if(v && v.length === 2 &&  v.charCodeAt(0) === 32) return v.substr(1);
			return v;
		},
		important: true
	},
	{
		name: 'translatableText',
		type: String
	},
	{
		type: 'splitter',
		title: 'Style:',
		name: 'text-style'
	},
	{
		name: 'style.align',
		type: String,
		select: [
			{name: 'center', value: 'center'},
			{name: 'left', value: 'left'},
			{name: 'right', value: 'right'}
		],
		default: 'center'
	},
	{
		name: 'style.fill',
		type: String,
		default:'#ffffff'
	},
	{
		name: 'style.stroke',
		type: String,
		default:'#000000'
	},
	{
		name: 'style.strokeThickness',
		type: Number
	},
	{
		name: 'style.fontFamily',
		type: String,
		default:'Arial'
	},
	{
		name: 'style.fontWeight',
		type: String,
		select: [
			{name: 'normal', value: 'normal'},
			{name: 'bold', value: 'bold'},
			{name: 'bolder', value: 'bolder'},
			{name: 'lighter', value: 'lighter'}
		],
		default: 'normal'
	},
	{
		name: 'style.fontSize',
		type: Number,
		min:0,
		max:300,
		default: 12,
		important: true
	},
	{
		name: 'style.leading',
		type: Number
	},
	{
		name: 'style.letterSpacing',
		type: Number
	}
]

/// #endif