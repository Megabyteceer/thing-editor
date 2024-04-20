import { Text } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import L from 'thing-editor/src/engine/utils/l';
import { stepTo } from 'thing-editor/src/engine/utils/utils';

export default class Label extends Text {

	@editable({ type: 'data-path', important: true })
	dataPath = null;

	@editable({ min: 0 })
	refreshInterval = 10;

	@editable({ type: 'string', multiline: true, tip: 'template example: <b>Your have %d coins</b>', disabled: (node: Label) => { return node.translatableText; } })
	template: string | null = null;

	/** replace pattern for translatableText */
	@editable({ disabled: o => !o.translatableText })
	paramName = '%d';

	@editable()
	isNumeric = false;

	@editable({ disabled: (node: Label) => { return !node.isNumeric; } })
	plusMinus = false;

	@editable({ min: 0.001, max: 1, step: 0.001, visible: (node: Label) => { return node.isNumeric; }, tip: '1 - shows value immediately. less that 1 - shows with counting.' })
	counterSpeed = 1;

	@editable({ min: 0, max: 20, visible: (node: Label) => { return node.isNumeric; } })
	decimalsCount = 0;

	@editable({ type: 'callback' })
	onChanged: string | null = null;

	@editable({ type: 'callback' })
	onCounter: string | null = null;

	@editable({ type: 'callback' })
	onCounterFinish: string | null = null;

	currentInterval = 0;
	showedVal: any;
	processedVal: any;
	lastUpdateTime = 0;

	localizationParams!: KeyedObject;

	init() {
		super.init();
		this.currentInterval = 0;
		this.text = '';
		this.showedVal = undefined;
		this.processedVal = undefined;
		this.lastUpdateTime = game.time;
		this.localizationParams = {};

		/// #if EDITOR
		if (this.translatableText) {
			if (L(this.translatableText).indexOf(this.paramName) < 0) {
				game.editor.ui.status.warn('Localized text contain no parameter ' + this.paramName, 99999, this, 'paramName');
			}
		}
		/// #endif
	}

	onLanguageChanged() {
		if ((this as any)._translatableText) {
			this.showedVal = undefined;
			this.refreshNow();

			if (
				/// #if EDITOR
				game.__EDITOR_mode ||
				/// #endif

				//@ts-ignore
				game.__paused) super.onLanguageChanged();

		}
	}

	customizeVal(val: any) {
		return val;
	}

	update() {
		if ((game.time - this.lastUpdateTime) > 1) {
			this.refreshNow();
		}
		this.lastUpdateTime = game.time;

		if (this.currentInterval <= 0 && this.dataPath) {

			let val = getValueByPath(this.dataPath, this);
			val = this.customizeVal(val);
			if (val || val === 0) {
				if (val !== this.processedVal) {
					if (this.onChanged) {
						callByPath(this.onChanged, this);
					}
					this.processedVal = val;
				}

				if (val !== this.showedVal) {
					this.visible = true;
					this.applyValue(val);
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
		super.update();
	}

	applyValue(val: any) {
		if (this.isNumeric) {
			if ((this.counterSpeed < 1) && (this.showedVal !== undefined)) {
				let step = Math.max(1 / Math.pow(10, this.decimalsCount), Math.abs((val - (this.showedVal || 0)) * this.counterSpeed));
				this.showedVal = stepTo(this.showedVal || 0, val, step);
				if (this.showedVal === val) {
					if (this.onCounterFinish) {
						callByPath(this.onCounterFinish, this);
					}
				} else {
					if (this.onCounter) {
						callByPath(this.onCounter, this);
					}
				}
			} else {
				this.showedVal = val;
			}
			if (this.plusMinus && val > 0) {
				val = '+' + Label.formatMoney(this.showedVal, this.decimalsCount);
			} else {
				val = Label.formatMoney(this.showedVal, this.decimalsCount);
			}

		} else {
			this.showedVal = val;
		}

		if (this.template) {
			this.text = this.template.replace(this.paramName, val);
		} else if ((this as any)._translatableText) {
			this.localizationParams[this.paramName] = val;
			this.text = L((this as any)._translatableText, this.localizationParams);
		} else {
			this.text = val;
		}
	}

	freezeCounter() {
		this.currentInterval = Number.MAX_SAFE_INTEGER;
	}

	unfreezeCounter() {
		this.currentInterval = 0;
	}

	refreshNow() {
		this.currentInterval = 0;
		this.lastUpdateTime = game.time;
		this.update();
	}

	/// #if EDITOR
	__beforeSerialization() {
		super.__beforeSerialization!();
		if ((this as any)._translatableText) {
			this.template = null;
		}
	}

	/// #endif
	static formatMoney(num: number, c = 0) {
		assert(typeof num === 'number', 'Numeric value expected, but got \'' + typeof num + '\'', 10012);

		let neg = num < 0;
		let ret;
		if (neg) {
			num = -num;
		}

		if (c > 0) {
			let str = num.toFixed(c).split('.');
			if (str[0].length > 3) {
				str[0] = str[0].replace(/(.)(?=(.{3})+$)/g, '$1 ');
			}
			ret = str.join('.');
		} else {
			ret = num.toFixed(0).replace(/(.)(?=(.{3})+$)/g, '$1 ');
		}
		if (neg) {
			return '-' + ret;
		}
		return ret;
	}
}

/// #if EDITOR
Label.__EDITOR_icon = 'tree/label';
Label.__EDITOR_tip = '<b>Label</b> - is component which represent value of specified javaScript variable on screen. Useful for in-game counters.';
/// #endif
