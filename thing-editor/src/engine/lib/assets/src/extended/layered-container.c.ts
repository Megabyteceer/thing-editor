
import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
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

	update(): void {
		super.update();
		if (this.rendererPortalContainer) {
			allPortalsContainers.add(this.rendererPortalContainer.parent);
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

LayeredContainer.__EDITOR_tip = '<b>LayeredContainer</b> - customizable layered container component. ' +
'Use "targetContainer" to specify the data-path of the container where the renderer portal is added. ' +
'Activate or deactivate layer rendering via "enabled", and ensure "rendererPortalContainer" is linked to a valid portal instance.';

/// #endif

const allPortalsContainers = new Set() as Set<Container>;

game.on('update', () => {
	allPortalsContainers.clear();
});

game.on('updated', () => {
	if (game.isUpdateBeforeRender) {
		allPortalsContainers.forEach(sortPortals);
	}
});

const sortPortals = (container:Container) => {
	if (container) {
		(container.children as LayeredContainerPortal[]).sort(sort);
	}
};

const sort = (a:LayeredContainerPortal, b:LayeredContainerPortal) => {
	return (a.containerOwner ? a.containerOwner.worldTransform.ty : 10000) - (b.containerOwner ? b.containerOwner.worldTransform.ty : 10000);
};
