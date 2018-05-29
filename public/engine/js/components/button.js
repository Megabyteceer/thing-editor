import Game from "../game.js";

export default class Button extends DSprite {
	
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
	
	disable() {
		if(this.disabledImage) {
			this.image = this.disabledImage;
		} else {
			this.alpha = 0.5;
		}
		this.interactive = false;
	}
	
	enable() {
		if(this.disabledImage) {
			this.image = this.initialImage;
		} else {
			this.alpha = 1;
		}
		this.interactive = true;
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
		if(this.pressImage) {
			this.image = this.pressImage;
		} else {
			this.scale.x =
			this.scale.y = this.initialScale * 0.9;
		}

		Button.downedButton = this;
		this.executeOnClick();
	}
	
	onUp() {
		if(this.pressImage) {
			this.image = this.initialImage;
		} else {
			this.scale.x =
			this.scale.y = this.initialScale;
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
window.addEventListener('keydown', (ev) => {
	
	for(var b of allActiveButtons) {
		if(b.interactive && b.hotkey === ev.keyCode) {
			var p = b.parent;
			while(p !== game.stage && p.interactiveChildren) {
				p = p.parent;
			}
			if(p.interactiveChildren) {
				b.executeOnClick();
			}
		}
	}
	
})

//EDITOR
Button.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'button:',
		name: 'button'
	},
	makeImageSelectEditablePropertyDecriptor('hoverImage', true),
	makeImageSelectEditablePropertyDecriptor('pressImage', true),
	makeImageSelectEditablePropertyDecriptor('disabledImage', true),
	{
		name: 'onClick',
		type: String,
		important: true
	},
	{
		name: 'afterClick',
		type: String
	},
	{
		name: 'hotkey',
		type: Number
	}
];

Button.EDITOR_icon = 'tree/button';
//ENDEDITOR