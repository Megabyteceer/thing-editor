export default PIXI.Text;

Object.defineProperty(PIXI.Text.prototype, "styleName", {
	get:function () {
		return this._styleName;
	},
	set: function (v) {
		this._styleName = v;
		this.style = Lib.getTextStyle(v);
	}
});


const textStyleSelectProperty = {
	name: 'styleName',
	type: String
}
Object.defineProperty(textStyleSelectProperty, 'select', {
	get:() => {
		return Lib.__stylesList;
	}
});

PIXI.Text.EDITOR_icon = 'tree/text';

PIXI.Text.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Text:',
		name: 'text-props'
	},
	{
		name: 'text',
		type: String
	},
	{
		name: 'translatableText',
		type: String
	},
	textStyleSelectProperty
]