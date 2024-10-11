import type UIContainer from 'libs/thing-games-utils/common/assets/src/ui/u-i-container.c';
import OrientationTrigger from 'thing-editor/src/engine/lib/assets/src/mobile/orientation-trigger.c';
import type Shape from '../../extended/shape.c';

export default class OrientationParentResizer extends OrientationTrigger {
	applyOrientation(): void {
		super.applyOrientation();
		if (this.parent) {
			if ((this.parent as UIContainer).W) {
				(this.parent as UIContainer).W = this.x;
				(this.parent as UIContainer).H = this.y;
			} else {
				(this.parent as Shape).width = this.x;
				(this.parent as Shape).height = this.y;
			}
		}
	}
}

/// #if EDITOR
OrientationParentResizer.__EDITOR_tip = 'works as OrientationTrigger, but additionally pass it`s {x,y} to parent`s {width,height}.';

/// #endif
