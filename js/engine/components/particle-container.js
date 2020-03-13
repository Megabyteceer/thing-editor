import Container from "./container.js";
/// #if EDITOR
import game from "../game.js";
/// #endif

export default class ParticleContainer extends Container {

	forAllChildren(callback) { // 99999 refactored to regular container
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			super.forAllChildren(callback);
		}
		/// #endif
	}

	gotoLabelRecursive(labelName) {
		/// #if EDITOR
		if(game.__EDITOR_mode) {
			super.forAllChildren(labelName);
		}
		/// #endif
	}
}

/// #if EDITOR
ParticleContainer.__EDITOR_icon = 'tree/particle-container';
ParticleContainer.__EDITOR_group = 'Extended';
/// #endif
