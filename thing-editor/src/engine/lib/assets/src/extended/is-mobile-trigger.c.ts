
import game from 'thing-editor/src/engine/game';
import OrientationTrigger from 'thing-editor/src/engine/lib/assets/src/mobile/orientation-trigger.c';

export default class IsMobileTrigger extends OrientationTrigger {

	_onRenderResize(): void {
		// disable
	}

	getTriggerConditionState() {
		return game.isMobile.any;
	}

	/// #if EDITOR

	__checkWarnings() {
		// disable
	}

	__onIsMobileChange() {
		this.applyOrientation();
	}

	/// #endif
}

/// #if EDITOR
IsMobileTrigger.__EDITOR_icon = 'tree/is-mobile';

/// #endif
