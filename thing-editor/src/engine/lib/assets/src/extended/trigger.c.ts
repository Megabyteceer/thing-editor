import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

/// #if EDITOR

const KEEP_VISIBLE__EDITABLE_PROPERTY_DESC = {
	afterEdited: () => {
		let o = game.editor.selection[0] as Trigger;
		if (!o.__keepVisibleInEditor) {
			o.visible = false;
		}
	}
};
/// #endif


export default class Trigger extends Container {

	initialAlpha = 1;
	initialScale = 1;
	initialX = 0;
	initialY = 0;

	triggering = false;
	_processedState: any = undefined;
	lastUpdateTime = 0;

	/// #if EDITOR
	__visibleInEditor?: boolean;

	/// #endif
	@editable({ type: 'btn', title: 'Centralize to content', name: 'Centralize', onClick: editorUtils.centralizeObjectToContent })

	_state = false;
	@editable({ disabled: o => o.dataPath as unknown as boolean })
	set state(val) {
		if (val) {
			this.show();
		} else {
			this.hide();
		}
	}

	get state() {
		return this._state;
	}

	@editable({ type: 'data-path', important: true })
	dataPath = null;

	@editable()
	invert = false;

	@editable({ step: 0.001, min: 0.001, max: 1, tip: 'Speed of switching animation. Set it to <b>1.0</b> for instant switching.' })
	@editable({ name: 'Animation preset', type: 'pow-damp-preset', notSerializable: true, separator: true })
	pow = 0.02;


	@editable({ step: 0.001, min: 0.001, max: 0.999, tip: 'Resistance for switching animation.' })
	damp = 0.85;

	@editable({ step: 0.01, min: -1, max: 0, separator: true })
	alphaShift = -1;

	@editable({ step: 0.01, min: -1 })
	scaleShift = 0;

	@editable()
	xShift = 0;

	@editable()
	yShift = 0;

	@editable()
	isApplyInteractivity = true;

	@editable({ type: 'callback', separator: true })
	@editable(editorUtils.makePreviewModeButton('Preview switched', 'components.Trigger#preview-switched'))
	onEnable: string | null = null;

	@editable({ type: 'callback' })
	onDisable: string | null = null;

	/// #if EDITOR
	@editable(KEEP_VISIBLE__EDITABLE_PROPERTY_DESC)
	__keepVisibleInEditor = false;
	/// #endif

	/** current soft switching state */
	q = 0;
	qSpeed = 0;

	/// #if EDITOR
	constructor() {
		super();
		this.__exitPreviewMode = this.__exitPreviewMode.bind(this);
	}
	/// #endif

	init() {
		super.init();
		this.initialAlpha = this.alpha;
		this.initialScale = this.scale.x;
		this.initialX = this.x;
		this.initialY = this.y;
		this.qSpeed = 0;
		this.triggering = false;
		this._processedState = undefined;
		if (!this.dataPath) {
			this.invert = this.state;
		}
		this.applyInstantly();
		this.lastUpdateTime = game.time;
	}

	getState() {
		return !!this.invert === (!getValueByPath(this.dataPath!, this));
	}

	applyInstantly() {
		assert(!game.__EDITOR_mode, 'applyInstantly could not be called in editor mode', 10024);
		if (this.dataPath) {
			this._state = this.getState();
		} else {
			this._state = !!this.invert;
		}
		if (this._state) {
			this.q = 0;
		} else {
			this.q = 1;
		}
		this.qSpeed = 0;
		this.updatePhase();
		this.interactiveChildren = this._state || (!this.isApplyInteractivity);
	}

	show() {
		this._state = true;
		this.interactiveChildren = true;
		this.triggering = true;
	}


	hide() {
		this._state = false;
		if (this.isApplyInteractivity) {
			this.interactiveChildren = false;
		}
		this.triggering = true;
		this.forAllChildren(processOnDisable);
	}

	toggle() {
		if (this._state) {
			this.hide();
		} else {
			this.show();
		}
	}

	updatePhase() {
		let qTo = this._state ? 0 : 1;
		if ((this.pow === 1) || ((Math.abs(qTo - this.q) < 0.002) && (Math.abs(this.qSpeed) < 0.002))) {
			this.triggering = false;
			this.q = qTo;
		} else {
			this.qSpeed += (qTo - this.q) * this.pow;
			this.qSpeed *= this.damp;
			this.q += this.qSpeed;
		}

		this.alpha = this.initialAlpha + this.q * this.alphaShift;

		if (this.scaleShift !== 0) {
			let s = this.initialScale + this.q * this.scaleShift;
			this.scale.x = s;
			this.scale.y = s;
		}
		this.visible = (this.alpha > 0.015) && (Math.abs(this.scale.x) > 0.0015);
		if (!this.visible && !this._state && ((this.initialAlpha + this.alphaShift) <= 0.015)) {
			this.triggering = false;
			this.q = qTo;
		}

		if (this.xShift !== 0) {
			this.x = this.initialX + this.q * this.xShift;
		}
		if (this.yShift !== 0) {
			this.y = this.initialY + this.q * this.yShift;
		}
	}

	update() {
		if (this.dataPath) {
			let s = this.getState();
			if (this._state !== s) {
				this.toggle();
			}
		}
		if (this.triggering) {
			this.updatePhase();
			if (!this._state && ((game.time - this.lastUpdateTime) > 1)) {
				this.applyInstantly();
			}
		}
		if (this.visible) {
			super.update();
		}
		if (this._processedState !== this._state) {
			this._processedState = this._state;
			if (this._processedState) {
				if (this.onEnable) {
					callByPath(this.onEnable, this);
				}
			} else {
				if (this.onDisable) {
					callByPath(this.onDisable, this);
				}
			}
		}
		this.lastUpdateTime = game.time;
	}
	/// #if EDITOR

	__EDITOR_onCreate() {
		window.setTimeout(() => {
			editorUtils.centralizeObjectToContent(this);
		}, 0);
	}

	//@ts-ignore
	set 'scale.x'(v) {
		//@ts-ignore
		super['scale.x'] = v;
		//@ts-ignore
		super['scale.y'] = v;
	}

	get 'scale.x'() {
		//@ts-ignore
		return super['scale.x'];
	}

	//@ts-ignore
	set 'scale.y'(v) {
		//@ts-ignore
		super['scale.x'] = v;
		//@ts-ignore
		super['scale.y'] = v;
	}

	get 'scale.y'() {
		//@ts-ignore
		return super['scale.x'];
	}

	__checkInteractionWarning() {
		if (this.isApplyInteractivity && (this.alphaShift === 0) && ((this.scaleShift + this.scale.x) !== 0)) {
			game.editor.ui.status.warn('Trigger disables interaction without alpha or scale effect. If you want to keep object clickable uncheck \'isApplyInteractivity\' property of trigger', 32030, this);
		}
	}

	__visibleInEditorSave? = false;

	__beforeSerialization() {
		if (this.__visibleInEditor) {
			this.__visibleInEditorSave = this.__visibleInEditor;
		}
		delete this.__visibleInEditor;
		this.__checkInteractionWarning();
	}

	__afterSerialization(serializedData: SerializedObject) {
		if (this.dataPath) {
			delete serializedData.p.state;
		}
		if (this.__visibleInEditorSave) {
			this.__visibleInEditor = this.__visibleInEditorSave;
			delete this.__visibleInEditorSave;
		}
	}

	__afterDeserialization() {
		this.__checkInteractionWarning();
	}

	__goToPreviewMode() {
		this.initialAlpha = this.alpha;
		this.initialScale = this.scale.x;
		this.initialX = this.x;
		this.initialY = this.y;

		this.alpha += this.alphaShift;
		this['scale.x'] += this.scaleShift;
		this.x += this.xShift;
		this.y += this.yShift;

	}

	__exitPreviewMode() {
		this.alpha = this.initialAlpha;
		this['scale.x'] = this.initialScale;
		this.x = this.initialX;
		this.y = this.initialY;
	}

	__onSelect() {
		super.__onSelect();
		this.__onChildSelected();
	}

	__onChildSelected() {
		if (!this._visible && game.__EDITOR_mode) {
			this.__visibleInEditor = true;
			if (visibleEnabledTriggers.indexOf(this) < 0) {
				visibleEnabledTriggers.push(this);
			}
		}
	}

	_visible = true;

	//@ts-ignore
	get visible(): boolean {
		return this._visible || (!game.editor.disableFieldsCache && (this.__visibleInEditor || ((this.__keepVisibleInEditor || game.editor.makeVisibleAll) && game.__EDITOR_mode)));
	}

	set visible(v: boolean) {
		delete this.__visibleInEditor;
		this._visible = v;
		if (!v) {
			this.__keepVisibleInEditor = false;
		}
	}

	/// #endif
}

const processOnDisable = (o: Container) => {
	if (o._onDisableByTrigger) {
		o._onDisableByTrigger();
	}
};

/// #if EDITOR


(Trigger.prototype.show as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Trigger.prototype.hide as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Trigger.prototype.toggle as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;

Trigger.__EDITOR_icon = 'tree/trigger';

Trigger.__EDITOR_tip = `<b>Trigger</b> - is component which smoothly or instantly <b>switches</b> it's <b>visibility</b> or/and <b>position</b> accordingly of value of specified javaScript variable.
If trigger become invisible because of alpha=0 or scale.x=0 or scale.y=0 it <b>stops</b> to <b>update</b> its children.`;


let visibleEnabledTriggers: Trigger[] = [];
window.setInterval(() => {
	for (let i = visibleEnabledTriggers.length - 1; i >= 0; i--) {
		let t = visibleEnabledTriggers[i];
		if (!t.__isAnyChildSelected()) {
			delete t.__visibleInEditor;
			visibleEnabledTriggers.splice(i, 1);
		}
	}
}, 1000);

/// #endif


