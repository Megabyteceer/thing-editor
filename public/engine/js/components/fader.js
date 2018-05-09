export default class Fader extends Sprite {
	
	init() {
		this.shooted = false;
		this.alpha = 0;
		this.width = W;
		this.height = H;
		this.tint = 0;
		this.texture = PIXI.Texture.WHITE;
	}
	
	update() {
		if(this.shooted) {
			this.alpha -= 0.1;
			if(this.alpha <= 0.01) {
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