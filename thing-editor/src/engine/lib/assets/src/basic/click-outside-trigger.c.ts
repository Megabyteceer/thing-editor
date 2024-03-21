import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import overlayLayer from 'thing-editor/src/editor/ui/editor-overlay';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import game from 'thing-editor/src/engine/game';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

const globalPointerDownEvents = (game.pixiApp.renderer.events.rootBoundary as any).mappingTable.pointerdown;

const all: ClickOutsideTrigger[] = [];

export default class ClickOutsideTrigger extends Container {
	@editable({ name: 'interactive', override: true, default: true })

	@editable({ type: 'callback', important: true })
	onClickOutside: string | null = null;

	@editable({ type: 'data-path' })
	additionalContainers: string[] = [];

	_insideContainers!: Container[];

	gameTime = 0;
	thisDownTime = 0;

	pointerDownListener = { fn: this.onStageDown.bind(this), priority: 10000 };

	constructor() {
		super();
		this.onThisDown = this.onThisDown.bind(this);
	}

	init() {
		/// #if EDITOR
		if (!this.onClickOutside) {
			game.editor.ui.status.warn('onClickOutside event handler is empty.', 32020, this, 'onClickOutside');
		}
		/// #endif

		super.init();

		all.push(this);

		this._insideContainers = [this
			/// #if EDITOR
			, overlayLayer
			/// #endif
		];
		if (this.additionalContainers) {
			for (let path of this.additionalContainers) {
				let c = getValueByPath(path, this);
				/// #if EDITOR
				if (!(c instanceof Container)) {
					game.editor.ui.status.error('Wrong "additionalContainers" entry: ' + path, 10070, this, 'additionalContainers');
					c = this;
					continue;
				}
				/// #endif
				this._insideContainers.push(c);
			}
		}
		globalPointerDownEvents.push(this.pointerDownListener);
		for (let o of this._insideContainers) {
			o.on('pointerdown', this.onThisDown);
		}
	}

	onRemove() {
		for (let o of this._insideContainers) {
			o.off('pointerdown', this.onThisDown);
		}
		all.splice(all.indexOf(this), 1);
		globalPointerDownEvents.splice(globalPointerDownEvents.indexOf(this.pointerDownListener), 1);
		super.onRemove();
	}

	onThisDown(ev: PointerEvent) {
		if (ev.buttons !== 4) {
			this.thisDownTime = game.time;
		}
	}

	onStageDown(ev: PointerEvent) {
		if (ev.buttons !== 4) {
			if (this.thisDownTime !== game.time && game.time === this.gameTime) {
				this.fire();
			}
		}
	}

	fire() {
		if (this.onClickOutside) {
			callByPath(this.onClickOutside, this);
		}
	}

	update() {
		this.gameTime = game.time;
		super.update();
	}

	static shootAll(exceptContainer?: Container) {
		loop1: for (const o of all) {
			if (o.getRootContainer() === game.currentContainer) {
				if (exceptContainer) {
					let p = exceptContainer;
					while (p) {
						if (o._insideContainers.indexOf(p) >= 0) {
							continue loop1;
						}
						p = p.parent;
					}
				}
				o.fire();
			}
		}
	}

	/// #if EDITOR
	__EDITOR_onCreate() {
		window.setTimeout(() => {
			editorUtils.centralizeObjectToContent(this);
		}, 0);
	}
	/// #endif
}

/// #if EDITOR
ClickOutsideTrigger.__EDITOR_icon = 'tree/click-outside';
/// #endif
