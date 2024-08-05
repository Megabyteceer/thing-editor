import Resizer from 'thing-editor/src/engine/lib/assets/src/extended/resizer.c';
import type Shape from 'thing-editor/src/engine/lib/assets/src/extended/shape.c';

export default class ParentResizer extends Resizer {

	recalculateSize() {
		super.recalculateSize();
		if (this.parent) {
			(this.parent! as Shape).width = this.x;
			(this.parent as Shape).height = this.y;
		}
	}
}

/// #if EDITOR
ParentResizer.__EDITOR_tip = 'works as Resizer, but additionally pass it`s {x,y} to parent`s {width,height}.';

/// #endif
