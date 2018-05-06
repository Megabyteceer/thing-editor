import Game from "../game.js";

export default class Button extends Sprite {
	
	constructor(p) {
		super();
		this.on('pointerdown', this.onDown)
			.on('pointerup', this.onUp)
			.on('pointerover', this.onOver)
			.on('pointerout', this.onOut);
	}
	
	init() {
		assert(!game.__EDITORmode, "'init()' called in edition mode");
		assert(allActiveButtons.indexOf(this) < 0, "Button already in active list.");
		allActiveButtons.push(this);
		this.interactive = true;
		this.buttonMode = true;
		super.init();
	}
	
	onRemove() {
		assert(!game.__EDITORmode, "'destroy()' called in edition mode");
		var i = allActiveButtons.indexOf(this);
		assert(i >= 0, 'Button is not in active list.')
		allActiveButtons.splice(i, 1);
		this.interactive = false;
		this.buttonMode = false;
	}
	
	executeOnClick() {
		if(!Game.disableAllButtons && !game.__EDITORmode) {
			Button.clickedButton = this;
			if (this.callback != null) {
				this.callback();
			}
			if (this.onClick) {
				game.call(this.onClick, this);
			}
			//Sounder.snd(this.clickSound);
			Button.clickedButton = null;
		}
	}
	onDown() {
		this.scale.x =
		this.scale.y = 0.9;
		Button.downedButton = this;
	}
	
	onUp() {
		this.scale.x =
		this.scale.y = 1.0;
		if(Button.downedButton === this) {
			this.executeOnClick();
		}
		Button.downedButton = null;
	}
	
	onOver() {
		Button.overerdButton = this;
		this.rotation = 0.1;
	}
	onOut() {
		Button.overerdButton = null;
		this.scale.x =
		this.scale.y = 1.0;
		Button.downedButton = null;
		this.rotation = 0.0;
	}
}

var allActiveButtons = [];

//EDITOR
Button.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'button:',
		name: 'button'
	},
	{
		name: 'onClick',
		type: String
	}
];

Button.EDITOR_icon = 'tree/button';
//ENDEDITOR