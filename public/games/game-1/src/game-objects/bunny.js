export default class Bunny extends DSprite {
	
	update() {
		this.vertexData[2] += Math.random();
		if (this.y > H - 25) {
			this.ySpeed *= -1;
			this.onTouchBounds();
		} else {
			this.ySpeed += 1;
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

/// #if EDITOR
Bunny.EDITOR_group = "Custom/Bunnies";

/// #endif