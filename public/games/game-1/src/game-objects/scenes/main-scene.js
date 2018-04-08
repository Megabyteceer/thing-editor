import Bunny from '../bunny.js';

class MainMenu extends Scene {
    
    onShow() {

		for (var i = 0; i < 25; i++) {
			var bunny = Lib.loadObject('bunny');
			bunny.name = 'bunny' + i;
			this.addChild(bunny);
		}
    }


}

export default MainMenu;