import engineUtils from '/js/engine/utils/game-utils.js';
import Settings from '/js/engine/utils/settings.js';


class Game {

	constructor (gameId, element) {
		this.settings = new Settings(gameId);
		
	}
}


export default Game