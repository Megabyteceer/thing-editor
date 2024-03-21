
import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import type LayeredContainer from 'thing-editor/src/engine/lib/assets/src/extended/layered-container.c';

export default class LayeredContainerPortal extends Container {

	@editable({ type: 'ref' })
	containerOwner!: LayeredContainer;

	render(renderer: any) {
		if (this.containerOwner.isRenderingLayered()) {
			this.containerOwner.renderForPortal(renderer);
		}
	}

	onRemove() {
		super.onRemove();
		this.containerOwner.rendererPortalContainer = null as any;
		this.containerOwner = null as any;
	}

	/// #if EDITOR
	static __canAcceptParent() {
		return false;
	}
	/// #endif
}
