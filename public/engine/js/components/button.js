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
		this.initialScale = this.scale.x;
		this.initialImage = this.image;
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
			if (this.afterClick) {
				game.call(this.afterClick, this);
			}
			//Sounder.snd(this.clickSound);
			Button.clickedButton = null;
		}
	}
	onDown() {
		this.scale.x =
		this.scale.y = this.initialScale * 0.9;
		Button.downedButton = this;
	}
	
	onUp() {
		this.scale.x =
		this.scale.y = this.initialScale;
		if(Button.downedButton === this) {
			this.executeOnClick();
		}
		Button.downedButton = null;
	}
	
	onOver() {
		Button.overerdButton = this;
		if(this.hoverImage) {
			this.image = this.hoverImage;
		} else {
			this.rotation = 0.1;
		}
	}
	onOut() {
		Button.overerdButton = null;
		this.scale.x =
		this.scale.y = this.initialScale;
		Button.downedButton = null;
		if(this.hoverImage) {
			this.image = this.initialImage;
		} else {
			this.rotation = 0;
		}
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
	makeImageSelectEditablePropertyDecriptor('hoverImage', true),
	{
		name: 'onClick',
		type: String
	},
	{
		name: 'afterClick',
		type: String
	}
];

Button.EDITOR_icon = 'tree/button';
//ENDEDITOR