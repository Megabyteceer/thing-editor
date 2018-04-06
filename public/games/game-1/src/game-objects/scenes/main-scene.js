import Bunny from '../bunny.js';

var texture = PIXI.Texture.fromImage('img/pic1.png');

class MainMenu extends Scene {
    
    onShow() {


		// Create a 5x5 grid of bunnies
		for (var i = 0; i < 25; i++) {
			var bunny = new Bunny(texture);
			bunny.name = 'bunny' + i;
			this.addChild(bunny);
		}
    }


}

export default MainMenu;