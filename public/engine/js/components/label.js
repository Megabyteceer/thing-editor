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
		this.showedVal = undefined;
	}
	
	update() {
		if(this.currentInterval <= 0 && this.dataPath) {
			
			var val = getValueByPath(this.dataPath, this);
			if(val !== undefined) {
				if(val !== this.showedVal) {
					this.visible = true;
					
					
					if(this.isMoney) {
						if(this.counterSpeed < 1) {
							let step = (val - (this.showedVal || 0)) * this.counterSpeed;
							this.showedVal = (this.showedVal || 0) + step;
						} else {
							this.showedVal = val;
						}
						if(this.plusMinus && val > 0) {
							val = '+' + formatMoney(this.showedVal, this.decimalsCount);
						} else {
							val = formatMoney(this.showedVal, this.decimalsCount);
						}
						
					} else {
						this.showedVal = val;
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

/// #if EDITOR

import Tip from "/editor/js/utils/tip.js";
Label.EDITOR_group = 'Extended';
Label.EDITOR_icon = 'tree/label';
Label.EDITOR_tip = `<b>Label</b> - is component which represent value of specified javaScript variable on screen. Useful for in-game counters.`;

Label.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Label:',
		name: 'label'
	},
	{
		name: 'dataPath',
		type: String,
		important: true,
		tip: Tip.tips.pathFieldTip
	},
	{
		name: 'refreshInterval',
		type: Number,
		min: 0,
		default: 10
	},
	{
		name: 'template',
		type: String,
		tip: `Label's text template with <b>%%</b> as marker of place where value will be inserted.
		As example label with teplate <b>Your money: %% coins</b> will appear on screen as "Your money: 1000 coins".`
	},
	{
		name: 'isMoney',
		type: Boolean
	},
	{
		name: 'plusMinus',
		type: Boolean
	},
	{
		name: 'counterSpeed',
		type: Number,
		min:0.001,
		max:1,
		step: 0.001,
		default: 1,
		tip: `When counterSpeed is <b>1</b> - label instantly takes and represent value.
<b>When counterSpeed less that 1</b> - label shows value as counter in few steps.
Property <b>counterSpeed</b> has effect only if <b>isMoney</b> property is enabled`
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


/// #endif