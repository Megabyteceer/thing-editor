import Container from "./container.js";
import game from "../game.js";
import callByPath from "../utils/call-by-path.js";
import getValueByPath from "../utils/get-value-by-path.js";

let interaction;

export default class ClickOutsideTrigger extends Container {

	init() {
		/// #if EDITOR
		if(!this.onClickOutside) {
			editor.ui.status.warn('onClickOutside event handler is empty.', 32020, this, 'onClickOutside');
		}
		/// #endif
		interaction = game.pixiApp.renderer.plugins.interaction;
		super.init();
		this.onStageDown = this.onStageDown.bind(this);
		this.handlerAdded = false;
		this._insideContainers = [this];
		if(this.additionalContainers) {
			for(let path of this.additionalContainers.split(',')) {
				let c = getValueByPath(path, this);
				/// #if EDITOR
				if(!(c instanceof Container)) {
					editor.ui.status.error('Wrong "additionalContainers" entry: ' + path, 10070, this, 'additionalContainers');
					c = this;
					continue;
				}
				/// #endif
				this._insideContainers.push(c);
			}
		}
	}

	onRemove() {
		super.onRemove();
		this.removeHandler();
	}

	onStageDown(ev) {
		if(game.time - this.time > 1) {
			this.removeHandler();
			return;
		}
		if(!ev.target) {
			this.fire();
		} else {
			let p = ev.target;
			while(p) {
				if(this._insideContainers.indexOf(p) >= 0) {
					return;
				}
				if(p === game.stage) {
					this.fire();
					return;
				}
				p = p.parent;
			}
		}
	}

	fire() {
		if(this.onClickOutside) {
			callByPath(this.onClickOutside, this);
		}
	}

	_onDisableByTrigger() {
		this.removeHandler();
	}

	update() {
		if(!this.handlerAdded) {
			this.handlerAdded = true;
			interaction.on('pointerdown', this.onStageDown);
		}
		this.time = game.time;
		super.update();
	}

	removeHandler() {
		if(this.handlerAdded) {
			this.handlerAdded = false;
			interaction.removeListener('pointerdown', this.onStageDown);
		}
	}
}

/// #if EDITOR
__EDITOR_editableProps(ClickOutsideTrigger, [
	{
		type: 'splitter',
		title: 'ClickOutsideTrigger:',
		name: 'click-outside-trigger'
	},
	{
		name: 'onClickOutside',
		type: 'callback',
		important: true
	},
	{
		name: 'additionalContainers',
		type: String
	}
]);
ClickOutsideTrigger.__EDITOR_group = 'Basic';
ClickOutsideTrigger.__EDITOR_icon = 'tree/click-outside';
/// #endif