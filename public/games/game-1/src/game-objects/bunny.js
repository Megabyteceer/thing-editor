var floorY = H - 25;

class Bunny extends Sprite {
	
	constructor(img) {
		super(img);
		this.gravity = 1;
	}
	
	update() {
		if (this.y > floorY) {
			this.ySpeed *= -1;
			this.onTouchBounds();
		} else {
			this.ySpeed += this.gravity;
		}
		
		if ((this.x < 0) || (this.x > W)) {
			this.xSpeed *= -1.0;
			this.onTouchBounds();
		}
		this.scale.x = this.xSpeed > 0 ? 1 : -1;
		super.update();
	}
	
	onTouchBounds() {
		this.rotation = (Math.random() - 0.5) * 0.2;
	}
}

export default Bunny;