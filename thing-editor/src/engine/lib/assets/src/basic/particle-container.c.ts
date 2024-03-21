/// #if EDITOR
import game from 'thing-editor/src/engine/game';
/// #endif
import { Container } from 'pixi.js';
import editable from 'thing-editor/src/editor/props-editor/editable';

export default class ParticleContainer extends Container {

	constructor() {
		super();
		this.interactiveChildren = false;
		this.eventMode = 'none';
	}

	@editable({ name: 'interactive', visible: () => false, override: true })

	forAllChildren(callback: (o: Container) => void) {
		/// #if EDITOR
		if (game.__EDITOR_mode) {
			super.forAllChildren(callback);
		}
		/// #endif
	}
}

/// #if EDITOR
ParticleContainer.__EDITOR_icon = 'tree/particle-container';
/// #endif
