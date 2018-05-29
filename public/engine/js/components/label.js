import getValueByPath from '../utils/get-value-by-path.js';

function formatMoney(n, c = 0) {
		var s = n < 0 ? "-" : "",
		i = String(parseInt(n = Math.abs(Number(n) || 0).toFixed(c))),
		j = (j = i.length) > 3 ? j % 3 : 0;
	return s + (j ? i.substr(0, j) + " " : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + ' ') + (c ? "." + Math.abs(n - i).toFixed(c).slice(2) : "");
};

export default class Label extends PIXI.Text {

	init() {
		super.init();
		this.currentInterval = 0;
		this.text = '';
		this.showedVal = '';
	}
	
	update() {
		if(this.currentInterval <= 0 && this.dataPath) {
			
			var val = getValueByPath(this.dataPath, this);
			if(val !== undefined) {
				if(val !== this.showedVal) {
					this.visible = true;
					this.showedVal = val;
					
					if(this.isMoney) {
						val = formatMoney(val, this.decimalsCount);
					}
					
					if(this.template) {
						this.text = this.template.replace('%%', val);
					} else {
						this.text = val;
					}
					if(this.onChanged) {
						game.call(this.onChanged, this);
					}
				}
			} else {
				this.showedVal = undefined;
				this.visible = false;
			}
		
			this.currentInterval = this.refreshInterval;
		} else {
			this.currentInterval--;
		}
	}
	
	refreshNow() {
		this.currentInterval = 0;
	}
}

Label.formatMoney = formatMoney;

//EDITOR

Label.EDITOR_icon = 'tree/label';

Label.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Label:',
		name: 'label'
	},
	{
		name: 'dataPath',
		type: String
	},
	{
		name: 'refreshInterval',
		type: Number,
		min: 0,
		default: 10
	},
	{
		name: 'template',
		type: String
	},
	{
		name: 'isMoney',
		type: Boolean
	},
	{
		name: 'decimalsCount',
		type: Number,
		min: 0
	},
	{
		name: 'onChanged',
		type: String
	}
];

//ENDEDITOR