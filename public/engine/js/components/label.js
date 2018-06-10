import getValueByPath from '../utils/get-value-by-path.js';

function formatMoney(num, c = 0) {
	if (c > 0) {
		let str = num.toFixed(c).split('.');
		if (str[0].length > 3) {
			str[0] = str[0].replace(/(\d)(?=(\d{3})+$)/g, '$1 ');
		}
		if (str[1].length > 3) {
			str[1] = str[1].replace(/(\d{3})/g, '$1 ');
		}
		return str.join('.');
	} else {
		return num.toFixed(0).replace(/(\d{3})/g, '$1 ');
	}
}

export default class Label extends PIXI.Text {

	init() {
		super.init();
		this.currentInterval = 0;
		this.text = '';
		this.showedVal = undefined;
	}
	
	onLanguageChanged() {
		if(this._translatableText) {
			this.showedVal = undefined;
			this.refreshNow();
			/// #if EDITOR
			if(game.__EDITORmode || game.__paused) super.onLanguageChanged();
			/// #endif
		}
	}
	
	update() {
		if(this.currentInterval <= 0 && this.dataPath) {
			
			let val = getValueByPath(this.dataPath, this);
			if(val !== undefined) {
				if(val !== this.processedVal) {
					if(this.onChanged) {
						game.call(this.onChanged, this);
					}
					this.processedVal = val;
				}
				if(val !== this.showedVal) {
					this.visible = true;
					
					
					if(this.isNumeric) {
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
					} else if(this._translatableText) {
						this.text = L(this._translatableText).replace('%%', val);
					} else {
						this.text = val;
					}
				}
			} else {
				this.processedVal = undefined;
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
	
	/// #if EDITOR
	__beforeSerialization() {
		super.__beforeSerialization();
		if(this._translatableText) {
			this.template = null;
		}
	}
	
	/// #endif
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
		type: 'data-path',
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
As example label with teplate <b>Your money: %% coins</b> will appear on screen as "Your money: 1000 coins".`,
		disabled:(node) => {
			return node.translatableText;
		}
	},
	{
		name: 'isNumeric',
		type: Boolean
	},
	{
		name: 'plusMinus',
		type: Boolean,
		disabled:(node) => {
			return !node.isNumeric;
		}
	},
	{
		name: 'counterSpeed',
		type: Number,
		min:0.001,
		max:1,
		step: 0.001,
		default: 1,
		tip: `When counterSpeed is <b>1</b> - label instantly takes and represent value.
<b>When counterSpeed less that 1</b> - label shows value as counter in few steps`,
		disabled:(node) => {
			return !node.isNumeric;
		}
	},
	{
		name: 'decimalsCount',
		type: Number,
		min: 0,
		max: 20,
		disabled:(node) => {
			return !node.isNumeric;
		}
	},
	{
		name: 'onChanged',
		type: String
	}
];


/// #endif