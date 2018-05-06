export default class Button extends Sprite {
	
	constructor(p) {
		super();
		this.interactive = true;
		this.buttonMode = true;
		this.on('pointerdown', this.executeOnClick);
	}
	
	init() {
		assert(!game.__EDITORmode, "'init()' called in edition mode");
		assert(allActiveButtons.indexOf(this) < 0, "Button already in active list.");
		allActiveButtons.push(this);
		super.init();
	}
	
	onRemove() {
		assert(!game.__EDITORmode, "'destroy()' called in edition mode");
		var i = allActiveButtons.indexOf(this);
		assert(i >= 0, 'Button is not in active list.')
		allActiveButtons.splice(i, 1);
	}
	
	executeOnClick() {
		if(!Button.disableAllButtons) {
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