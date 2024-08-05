import OrientationTrigger from 'thing-editor/src/engine/lib/assets/src/mobile/orientation-trigger.c';
import type Shape from '../../extended/shape.c';

export default class OrientationParentResizer extends OrientationTrigger {
	applyOrientation(): void {
		super.applyOrientation();
		if (this.parent) {
			(this.parent! as Shape).width = this.x;
			(this.parent as Shape).height = this.y;
		}
	}
}

/// #if EDITOR
OrientationParentResizer.__EDITOR_tip = 'works as OrientationTrigger, but additionally pass it`s {x,y} to parent`s {width,height}.';

/// #endif
