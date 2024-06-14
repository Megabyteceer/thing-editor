import OrientationTrigger from 'thing-editor/src/engine/lib/assets/src/mobile/orientation-trigger.c';

export default class AnchorOrientation extends OrientationTrigger {
	applyOrientation(): void {
		super.applyOrientation();
		if (this.parent) {
			(this.parent! as Shape).width = this.x;
			(this.parent as Shape).height = this.y;
		}
	}
}
