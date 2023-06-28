/// #if EDITOR
import game from "thing-editor/src/engine/game";
/// #endif
import { Container } from "pixi.js";
import { SourceMappedConstructor } from "thing-editor/src/editor/env";

export default class ParticleContainer extends Container {

	forAllChildren(callback: (o: Container) => void) {
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			super.forAllChildren(callback);
		}
		/// #endif
	}
}

/// #if EDITOR
(ParticleContainer as any as SourceMappedConstructor).__EDITOR_icon = 'tree/particle-container';
/// #endif
