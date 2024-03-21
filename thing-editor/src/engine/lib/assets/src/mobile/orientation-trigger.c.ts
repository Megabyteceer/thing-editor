import editable from 'thing-editor/src/editor/props-editor/editable';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import game from 'thing-editor/src/engine/game';
import Container from 'thing-editor/src/engine/lib/assets/src/basic/container.c';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';

const propDisabler = (_o: OrientationTrigger) => { return true; };

/// #if EDITOR
let IGNORE_DIRECT_PROPS = false;
/// #endif

export default class OrientationTrigger extends Container {

	__currentOrientationIsPortrait = false;

	/// #if EDITOR

	_alpha = 1;

	__onPortrait: string | null = null;
	__onLandscape: string | null = null;

	@editable({ type: 'callback' })
	set onPortrait(val: string | null) {
		this.__onPortrait = val;
		if (!IGNORE_DIRECT_PROPS) {
			this.__callIfValueByPathSetter(this.__onPortrait);
			if (!this.getTriggerConditionState()) {
				const extendData = this.__nodeExtendData;
				window.setTimeout(() => {
					if (extendData === this.__nodeExtendData) {
						this.__callIfValueByPathSetter(this.__onLandscape);
					}
				}, 600);
			}
		}
	}
	get onPortrait(): string | null {
		return this.__onPortrait;
	}

	@editable({ type: 'callback' })
	set onLandscape(val: string | null) {
		this.__onLandscape = val;
		if (!IGNORE_DIRECT_PROPS) {
			this.__callIfValueByPathSetter(this.__onLandscape);
			if (this.getTriggerConditionState()) {
				const extendData = this.__nodeExtendData;
				window.setTimeout(() => {
					if (extendData === this.__nodeExtendData) {
						this.__callIfValueByPathSetter(this.__onPortrait);
					}
				}, 600);
			}
		}
	}
	get onLandscape(): string | null {
		return this.__onLandscape;
	}

	@editable()
	__callInEditorMode = false;

	@editable({ type: 'btn', title: 'Centralize to content', name: 'Centralize', onClick: editorUtils.centralizeObjectToContent })

	/*
	/// #endif
	onPortrait:string | null = null;
	onLandscape:string | null = null;
	//*/

	@editable({ disabled: propDisabler })
	landscapeX = 0;
	@editable({ disabled: propDisabler })
	landscapeY = 0;
	@editable({ disabled: propDisabler })
	landscapeScaleX = 0;
	@editable({ disabled: propDisabler })
	landscapeScaleY = 0;
	@editable({ disabled: propDisabler })
	landscapeAlpha = 0;
	@editable({ disabled: propDisabler })
	landscapeR = 0;

	@editable({ disabled: propDisabler })
	portraitX = 0;
	@editable({ disabled: propDisabler })
	portraitY = 0;
	@editable({ disabled: propDisabler })
	portraitScaleX = 0;
	@editable({ disabled: propDisabler })
	portraitScaleY = 0;
	@editable({ disabled: propDisabler })
	portraitAlpha = 0;
	@editable({ disabled: propDisabler })
	portraitR = 0;


	init() {
		super.init();
		this.applyOrientation();
	}

	getTriggerConditionState() {
		return game.isPortrait;
	}

	applyOrientation() {
		this.__currentOrientationIsPortrait = this.getTriggerConditionState();
		if (this.__currentOrientationIsPortrait) {
			this.x = this.portraitX;
			this.y = this.portraitY;
			this['scale.x'] = this.portraitScaleX;
			this['scale.y'] = this.portraitScaleY;
			this.alpha = this.portraitAlpha;
			this.rotation = this.portraitR;
			this._callHandler(this.onPortrait
				/// #if EDITOR
				, 'onPortrait'
				/// #endif
			);
		} else {
			this.x = this.landscapeX;
			this.y = this.landscapeY;
			this['scale.x'] = this.landscapeScaleX;
			this['scale.y'] = this.landscapeScaleY;
			this.alpha = this.landscapeAlpha;
			this.rotation = this.landscapeR;
			this._callHandler(this.onLandscape
				/// #if EDITOR
				, 'onLandscape'
				/// #endif
			);
		}
	}

	_callHandler(handler: string | null
		/// #if EDITOR
		, handlerName: string
		/// #endif
	) {

		this.visible = (this.alpha > 0.015) && (Math.abs(this.scale.x) > 0.0015) && (Math.abs(this.scale.y) > 0.0015);

		/// #if EDITOR
		if (handler) {
			let h = handler.split(',')[0];
			if (h === 'this.update') {
				game.editor.ui.status.warn('OrientationTrigger`s "' + handlerName + '" handler has value "this.update", but only "this.parent.update" is possible, and if OrientationTrigger is last children only.', 10071, this, handlerName);
				return;
			}
			else if (h === 'this.parent.update' && this.parent.children.indexOf(this) < (this.parent.children.length - 1)) {
				game.editor.ui.status.warn('OrientationTrigger`s "' + handlerName + '" handler has value "this.parent.update", but it is not last children of parent. Please move this OrientationTrigger to the end of the list.', 10072, this, handlerName);
				return;
			}
		}
		/// #endif
		if (handler
			/// #if EDITOR
			&& (!game.__EDITOR_mode || handler.startsWith('setValueByPath`') || this.__callInEditorMode)
			/// #endif
		) {
			callByPath(handler, this);
		}
	}

	update() {
		if (this.visible) {
			super.update();
		}
	}

	_onRenderResize() {
		if (this.__currentOrientationIsPortrait !== game.isPortrait // eslint-disable-line no-constant-condition
			/// #if EDITOR
			|| true
			/// #endif

		) {
			this.applyOrientation();
		}
	}

	/// #if EDITOR

	__callIfValueByPathSetter(path: string | null) {
		if (path && path.startsWith('setValueByPath`')) {
			try {
				callByPath(path, this);
			} catch (er) {
				console.error(er);
			}
		}
	}

	__EDITOR_onCreate() {
		this.__checkWarnings();
		window.setTimeout(() => {
			if (this.getTriggerConditionState()) {
				this.landscapeX = this.portraitX;
				this.landscapeY = this.portraitY;
				this.landscapeScaleX = this.portraitScaleX;
				this.landscapeScaleY = this.portraitScaleY;
				this.landscapeAlpha = this.portraitAlpha;
				this.landscapeR = this.portraitR;
			} else {
				this.portraitX = this.landscapeX;
				this.portraitY = this.landscapeY;
				this.portraitScaleX = this.landscapeScaleX;
				this.portraitScaleY = this.landscapeScaleY;
				this.portraitAlpha = this.landscapeAlpha;
				this.portraitR = this.landscapeR;
			}
			editorUtils.centralizeObjectToContent(this);
		}, 0);
	}

	//@ts-ignore
	set alpha(v) {
		this._alpha = v;
		if (IGNORE_DIRECT_PROPS) return;
		if (this.getTriggerConditionState()) {
			this.portraitAlpha = v;
		} else {
			this.landscapeAlpha = v;
		}
	}

	get alpha() {
		if (IGNORE_DIRECT_PROPS) return this._alpha;
		if (this.getTriggerConditionState()) {
			return this._alpha = isNaN(this.portraitAlpha) ? 1 : this.portraitAlpha;
		} else {
			return this._alpha = isNaN(this.landscapeAlpha) ? 1 : this.landscapeAlpha;
		}
	}

	set x(v) {
		super.x = v;
		if (IGNORE_DIRECT_PROPS) return;
		if (this.getTriggerConditionState()) {
			this.portraitX = v;
		} else {
			this.landscapeX = v;
		}
	}

	get x() {
		if (IGNORE_DIRECT_PROPS) return super.x;
		if (this.getTriggerConditionState()) {
			return super.x = isNaN(this.portraitX) ? 0 : this.portraitX;
		} else {
			return super.x = isNaN(this.landscapeX) ? 0 : this.landscapeX;
		}
	}

	set rotation(v) {
		super.rotation = v;
		if (IGNORE_DIRECT_PROPS) return;
		if (this.getTriggerConditionState()) {
			this.portraitR = v;
		} else {
			this.landscapeR = v;
		}
	}

	get rotation() {
		if (IGNORE_DIRECT_PROPS) return super.rotation;
		if (this.getTriggerConditionState()) {
			return super.rotation = isNaN(this.portraitR) ? 0 : this.portraitR;
		} else {
			return super.rotation = isNaN(this.landscapeR) ? 0 : this.landscapeR;
		}
	}

	set y(v) {
		super.y = v;
		if (IGNORE_DIRECT_PROPS) return;
		if (this.getTriggerConditionState()) {
			this.portraitY = v;
		} else {
			this.landscapeY = v;
		}
	}

	get y() {
		if (IGNORE_DIRECT_PROPS) return super.y;
		if (this.getTriggerConditionState()) {
			return super.y = isNaN(this.portraitY) ? 0 : this.portraitY;
		} else {
			return super.y = isNaN(this.landscapeY) ? 0 : this.landscapeY;
		}
	}
	//@ts-ignore
	set 'scale.x'(v) {
		//@ts-ignore
		super['scale.x'] = v;
		if (IGNORE_DIRECT_PROPS) return;
		if (this.getTriggerConditionState()) {
			this.portraitScaleX = v;
		} else {
			this.landscapeScaleX = v;
		}
	}

	get 'scale.x'() {
		//@ts-ignore
		if (IGNORE_DIRECT_PROPS) return super['scale.x'];
		if (this.getTriggerConditionState()) {
			return super.scale.x = isNaN(this.portraitScaleX) ? 0 : this.portraitScaleX;
		} else {
			return super.scale.x = isNaN(this.landscapeScaleX) ? 0 : this.landscapeScaleX;
		}
	}
	//@ts-ignore
	set 'scale.y'(v) {
		//@ts-ignore
		super['scale.y'] = v;
		if (IGNORE_DIRECT_PROPS) return;
		if (this.getTriggerConditionState()) {
			this.portraitScaleY = v;
		} else {
			this.landscapeScaleY = v;
		}
	}

	get 'scale.y'() {
		//@ts-ignore
		if (IGNORE_DIRECT_PROPS) return super['scale.y'];
		if (this.getTriggerConditionState()) {
			return super.scale.y = isNaN(this.portraitScaleY) ? 0 : this.portraitScaleY;
		} else {
			return super.scale.y = isNaN(this.landscapeScaleY) ? 0 : this.landscapeScaleY;
		}
	}

	__beforeSerialization() {
		IGNORE_DIRECT_PROPS = true;
		if (!this.__nodeExtendData.isTypeChanging) {
			this.x = 0;
			this.y = 0;
			this.rotation = 0;
			this.alpha = 1;
			this.scale.x = 1;
			this.scale.y = 1;
		}
	}

	__afterSerialization() {
		IGNORE_DIRECT_PROPS = false;
		this.applyOrientation();
	}

	__beforeDeserialization() {
		IGNORE_DIRECT_PROPS = true;
	}

	__checkWarnings() {
		if (game.projectDesc.screenOrientation !== 'auto') {
			game.editor.ui.status.warn('Orientation trigger is not useful if projects screenOrientation is not set to \'auto\'', 32023, this);
		}
	}

	__afterDeserialization() {
		IGNORE_DIRECT_PROPS = false;
		if (game.__EDITOR_mode) {
			this.applyOrientation();
		}
	}

	__shiftObject(dx: number, dy: number) {
		super.x += dx;
		super.y += dy;
		this.landscapeX += dx;
		this.portraitX += dx;
		this.landscapeY += dy;
		this.portraitY += dy;
	}

	static __beforeChangeToThisType(_o: Container) {
		const o = _o as OrientationTrigger;
		if (isNaN(o.landscapeX) || isNaN(o.landscapeY) ||
			isNaN(o.landscapeScaleX) || isNaN(o.landscapeScaleY) ||
			isNaN(o.landscapeAlpha) || isNaN(o.landscapeR)) {
			o.landscapeX = o.portraitX = o.x;
			o.landscapeY = o.portraitY = o.y;
			o.landscapeScaleX = o.portraitScaleX = o['scale.x'];
			o.landscapeScaleY = o.portraitScaleY = o['scale.y'];
			o.landscapeAlpha = o.portraitAlpha = o.alpha;
			o.landscapeR = o.portraitR = o.rotation;
		}
	}

	/// #endif

}

/// #if EDITOR
OrientationTrigger.__EDITOR_icon = 'tree/orientation-trigger';

/// #endif


