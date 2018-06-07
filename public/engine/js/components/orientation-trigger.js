import Trigger from "./trigger.js";

export default class OrientationTrigger extends Trigger {
	
	init() {
		
		super.init();
		
		this.__currentOrientationIsPortrait = game.isPortrait;
		this.applyOrientation();
	}
	
	get dataPath() {
		return 'game.isPortrait';
	}
	
	applyOrientation() {
		this.q = game.isPortrait ? 1 : 0;
		this._state = game.isPortrait;
		this.updatePhase();
	}
	

	_onOrientationSwitch() {
		if(this.__currentOrientationIsPortrait !== game.isPortrait) {
			this.__beforeSerialization();
			this.__currentOrientationIsPortrait = game.isPortrait;
			this.applyOrientation();
		}
	}
	
/// #if EDITOR
	__beforeSerialization() {
		
		let alphaD = this.alpha - this.initialAlpha;
		let scaleD = this.scale.x - this.initialScale;
		let xD = this.x - this.initialX;
		let yD = this.y - this.initialY;
		
		if(game.isPortrait) {
			// apply any changes in to shifts
			this.alphaShift -= alphaD;
			this.initialAlpha += alphaD;
			this.alpha = this.initialAlpha;
			
			this.scaleShift -= scaleD;
			this.initialScale += scaleD;
			this.scale.x = this.scale.y = this.initialScale;
			
			this.xShift -= xD;
			this.initialX += xD;
			this.x == this.initialX;
			
			this.yShift -= yD;
			this.initialY += yD;
			this.y == this.initialY;
			
		} else {
			this.alphaShift += alphaD;
			this.initialAlpha = this.alpha;
			
			this.scaleShift += scaleD;
			this.initialScale = this.scale.x;
			
			this.xShift += xD;
			this.initialX = this.x;
			
			this.yShift += yD;
			this.initialY = this.y;
		}
		
		this.q = 0;
		this._state = false;
		this.updatePhase();
	}
	__afterSerialization() {
		this.applyOrientation();
	}
	
/// #endif
}


/// #if EDITOR
OrientationTrigger.EDITOR_group = 'Extended';
OrientationTrigger.EDITOR_icon = 'tree/orientation-trigger';
OrientationTrigger.EDITOR_tip = `<b>OrientationTrigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> and <b>scale</b> accordingly of <b>game.isPortrait</b> variable.
It's main destinguish from Trigger is thet OrientationTrigger switches its state in edition time, so you can edit both states by push "Switch screen orientation button" in view port (Ctrl + O)`;

/// #endif

