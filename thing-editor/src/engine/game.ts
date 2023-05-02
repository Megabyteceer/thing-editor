import Editor from "../editor/editor";

class Game {

	editor?: Editor;

	init() {
		alert('game.init 1');

	}

	alert() {
		alert('game.alert: 1');
	}
}

const game = new Game();
export default game;

export { Game }