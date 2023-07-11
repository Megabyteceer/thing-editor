import { Container } from "pixi.js";
import { SourceMappedConstructor } from "thing-editor/src/editor/env";
import editable from "thing-editor/src/editor/props-editor/editable";
import game from "thing-editor/src/engine/game";
import callByPath from "thing-editor/src/engine/utils/call-by-path";
import getValueByPath from "thing-editor/src/engine/utils/get-value-by-path";

export default class ClickOutsideTrigger extends Container {


	@editable({ name: 'interactive', override: true, default: true })

	@editable({ type: 'callback', important: true })
	onClickOutside: string | null = null;

	@editable({ type: 'data-path' })
	additionalContainers: string[] = [];

	_insideContainers!: Container[];

	gameTime = 0;
	thisDownTime = 0;

	constructor() {
		super();
		this.onStageDown = this.onStageDown.bind(this);
		this.onThisDown = this.onThisDown.bind(this);
	}

	init() {
		/// #if EDITOR
		if(!this.onClickOutside) {
			game.editor.ui.status.warn('onClickOutside event handler is empty.', 32020, this, 'onClickOutside');
		}
		/// #endif

		super.init();


		this._insideContainers = [this];
		if(this.additionalContainers) {
			for(let path of this.additionalContainers) {
				let c = getValueByPath(path, this);
				/// #if EDITOR
				if(!(c instanceof Container)) {
					game.editor.ui.status.error('Wrong "additionalContainers" entry: ' + path, 10070, this, 'additionalContainers');
					c = this;
					continue;
				}
				/// #endif
				this._insideContainers.push(c);
			}
		}
		(game.pixiApp.view as HTMLCanvasElement).addEventListener('pointerdown', this.onStageDown);
		for(let o of this._insideContainers) {
			o.on('pointerdown', this.onThisDown);
		}
	}

	onRemove() {
		for(let o of this._insideContainers) {
			o.off('pointerdown', this.onThisDown);
		}
		(game.pixiApp.view as HTMLCanvasElement).removeEventListener('pointerdown', this.onStageDown);
		super.onRemove();
	}

	onThisDown() {
		this.thisDownTime = game.time;
	}

	onStageDown() {
		if(this.thisDownTime !== game.time && game.time === this.gameTime) {
			this.fire();
		}
	}

	fire() {
		if(this.onClickOutside) {
			callByPath(this.onClickOutside, this);
		}
	}

	update() {
		this.gameTime = game.time;
		super.update();
	}
}

/// #if EDITOR
(ClickOutsideTrigger as any as SourceMappedConstructor).__EDITOR_icon = 'tree/click-outside';
/// #endif