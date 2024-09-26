
import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import assert from 'thing-editor/src/engine/debug/assert';
import Lib from 'thing-editor/src/engine/lib';
import LayeredContainerPortal from 'thing-editor/src/engine/lib/assets/src/extended/layered-contaiter-portal.c';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';

export default class LayeredContainer extends Container {

	@editable({ type: 'data-path' })
	set targetContainer(v: string) {
		this._targetContainer = v;
		this._updateTargetContainer();
	}

	get targetContainer() {
		return this._targetContainer;
	}

	_targetContainer: string = null!;

	@editable()
	enabled = true;

	@editable({ type: 'ref' })
	rendererPortalContainer!: LayeredContainerPortal;

	needInit = true;

	init() {
		super.init();
		this.rendererPortalContainer = Lib._loadClassInstanceById('LayeredContainerPortal') as LayeredContainerPortal;
		this.rendererPortalContainer.containerOwner = this;
		this.needInit = true;
	}

	enable() {
		this.enabled = true;
		this._updateTargetContainer();
	}

	disable() {
		this.enabled = false;
		this._updateTargetContainer();
	}

	isRenderingLayered() {
		return this.enabled
		/// #if EDITOR
		 && this.rendererPortalContainer &&
		this._targetContainer;
		/// #endif
	}

	_updateTargetContainer() {
		if (this.rendererPortalContainer) {
			if (this._targetContainer && this.enabled) {
				let c = getValueByPath(this._targetContainer, this);
				assert(c, 'Invalid targetContainer data-path value: ' + this._targetContainer);
				if (this.rendererPortalContainer.parent !== c) {
					c.addChild(this.rendererPortalContainer);
				}
			}
		}
	}

	render(renderer: any) {
		if (this.needInit) {
			this._updateTargetContainer();
			this.needInit = false;
		}
		if (!this.isRenderingLayered()) {
			super.render(renderer);
		}
	}

	renderForPortal(renderer: any) {
		if (this.needInit) {
			this._updateTargetContainer();
			this._recursivePostUpdateTransform();
			this.updateTransform();
			this.needInit = false;
		}
		this.visible = this.parent.worldVisible;
		super.render(renderer);
	}

	onRemove() {
		if (this.rendererPortalContainer) {
			this.rendererPortalContainer.removeWithoutHolder();
		}
		super.onRemove();
	}
}
/// #if EDITOR
LayeredContainer.__requiredComponents = [LayeredContainerPortal];

/// #endif
