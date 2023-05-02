/// #if EDITOR
import Editor from "thing-editor/src/editor/editor";
/// #if EDITOR

class Game {

	/// #if EDITOR
	//@ts-ignore
	editor: Editor;
	/// #endif

	init() {
		alert('game.init 3');

	}

	alert() {
		alert('game.alert: 3');
	}
}

const game = new Game();
export default game;

export { Game }
