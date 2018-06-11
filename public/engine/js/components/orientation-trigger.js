import Container from "./container.js";
import Trigger from "./trigger.js";

/// #if EDITOR
let IGNORE_DIRECT_PROPS = false;
/// #endif

export default class OrientationTrigger extends Container {
	
	init() {
		super.init();
		this.applyOrientation();
	}
	
	applyOrientation() {
		this.__currentOrientationIsPortrait = game.isPortrait;
		if(game.isPortrait) {
			this.x = this.portraitX;
			this.y = this.portraitY;
			this['scale.x'] = this.portraitScaleX;
			this['scale.y'] = this.portraitScaleY;
			super.alpha = this.portraitAlpha;
			this.rotation = this.portraitR;
		} else {
			this.x = this.landscapeX;
			this.y = this.landscapeY;
			this['scale.x'] = this.landscapeScaleX;
			this['scale.y'] = this.landscapeScaleY;
			this.alpha = this.landscapeAlpha;
			this.rotation = this.landscapeR;
		}
	}
	
	_onOrientationSwitch() {
		
		/// #if EDITOR
		this.__currentOrientationIsPortrait = 0; //enforse to applyOrientation
		/// #endif
		
		if(this.__currentOrientationIsPortrait !== game.isPortrait) {
			this.applyOrientation();
		}
	}
	
	/// #if EDITOR
	set alpha(v) {
		super.alpha = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitAlpha = v;
		} else {
			this.landscapeAlpha = v;
		}
	}

	get alpha() {
		if(IGNORE_DIRECT_PROPS) return super.alpha;
		if(game.isPortrait) {
			return super.alpha = this.portraitAlpha;
		} else {
			return super.alpha = this.landscapeAlpha;
		}
	}
	
	set x(v) {
		super.x = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitX = v;
		} else {
			this.landscapeX = v;
		}
	}

	get x() {
		if(IGNORE_DIRECT_PROPS) return super.x;
		if(game.isPortrait) {
			return super.x = this.portraitX;
		} else {
			return super.x = this.landscapeX;
		}
	}
	
	set rotation(v) {
		super.rotation = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitR = v;
		} else {
			this.landscapeR = v;
		}
	}

	get rotation() {
		if(IGNORE_DIRECT_PROPS) return super.rotation;
		if(game.isPortrait) {
			return super.rotation = this.portraitR;
		} else {
			return super.rotation = this.landscapeR;
		}
	}
	
	set y(v) {
		super.y = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitY = v;
		} else {
			this.landscapeY = v;
		}
	}

	get y() {
		if(IGNORE_DIRECT_PROPS) return super.y;
		if(game.isPortrait) {
			return super.y = this.portraitY;
		} else {
			return super.y = this.landscapeY;
		}
	}
	
	set "scale.x"(v) {
		super['scale.x'] = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitScaleX = v;
		} else {
			this.landscapeScaleX = v;
		}
	}

	get "scale.x"() {
		if(IGNORE_DIRECT_PROPS) return super['scale.x'];
		if(game.isPortrait) {
			return super.scale.x = this.portraitScaleX;
		} else {
			return super.scale.x = this.landscapeScaleX;
		}
	}
	
	set "scale.y"(v) {
		super['scale.y'] = v;
		if(IGNORE_DIRECT_PROPS) return;
		if(game.isPortrait) {
			this.portraitScaleY = v;
		} else {
			this.landscapeScaleY = v;
		}
	}

	get "scale.y"() {
		if(IGNORE_DIRECT_PROPS) return super['scale.y'];
		if(game.isPortrait) {
			return super.scale.y =  this.portraitScaleY;
		} else {
			return super.scale.y =  this.landscapeScaleY;
		}
	}
	
	__afterSerialization() {
		this.applyOrientation();
	}
	
	__beforeSerialization() {
		IGNORE_DIRECT_PROPS = true;
		this.x = 0;
		this.y = 0;
		this.rotation = 0;
		this.alpha = 1;
		this.scale.x = 1;
		this.scale.y = 1;
	}
	
	__afterSerialization() {
		IGNORE_DIRECT_PROPS = false;
		this.applyOrientation();
	}
	
	__beforeDeserialization() {
		IGNORE_DIRECT_PROPS = true;
	}
	
	__afterDeserialization() {
		IGNORE_DIRECT_PROPS = false;
		this.applyOrientation();
	}
	/// #endif
}


/// #if EDITOR
OrientationTrigger.EDITOR_group = 'Extended';
OrientationTrigger.EDITOR_icon = 'tree/orientation-trigger';
OrientationTrigger.EDITOR_tip = `<b>OrientationTrigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> and <b>scale</b> accordingly of <b>game.isPortrait</b> variable.
It's main destinguish from Trigger is thet OrientationTrigger switches its state in edition time, so you can edit both states by push "Switch screen orientation button" in view port (Ctrl + O)`;

const propDisabler = () => {return true};

OrientationTrigger.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'OrientationTigger:',
		name: 'trigger'
	},
	{
		name: 'landscapeX',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'landscapeY',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'landscapeAlpha',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'landscapeScaleX',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'landscapeScaleY',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'landscapeR',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'portraitX',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'portraitY',
		type: Number,
		disabled:propDisabler
	},
	{
		name: 'portraitAlpha',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'portraitScaleY',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'portraitScaleX',
		type: Number,
		default:1,
		disabled:propDisabler
	},
	{
		name: 'portraitR',
		type: Number,
		disabled:propDisabler
	}
]

/// #endif

