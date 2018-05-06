export default class Fader extends Sprite {
	
	constructor() {
		super();
		this.texture = PIXI.PIXI.Texture.WHITE;
	}
	
	init() {
		this.shooted = false;
		this.alpha = 0;
	}
	
	update() {
		if(this.shooted) {
			this.alpha -= 0.1;
			if(this.alpha <= 0.01){
				game.faderEnd();
			}
		} else {
			this.alpha += 0.1;
			if(this.alpha >= 1.0) {
				game.faderShoot();
				this.shooted = true;
			}
		}
		super.update();
	}
}