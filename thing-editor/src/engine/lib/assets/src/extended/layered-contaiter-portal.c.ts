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

/// #if EDITOR
LayeredContainerPortal.__EDITOR_tip = `<b>LayeredContainerPortal</b> - portal component for rendering layers. 
This component is used in conjunction with <b>LayeredContainer</b> to render content into a target container. 
Ensure that the "containerOwner" property is linked to an instance of <b>LayeredContainer</b>.

<b>Use Case:</b>
Use this component when you need to render different layers of your game (e.g., background, characters, UI) into specific containers dynamically. 
`;
/// #endif
