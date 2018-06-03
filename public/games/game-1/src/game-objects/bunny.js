export default class Bunny extends DSprite {
	
	update() {
		this.vertexData[2] += Math.random();
		if (this.y > H - 25) {
			this.ySpeed *= -1;
			this.onTouchBounds();
		} else {
			this.ySpeed += 1;
		}
		
		game.settings.setItem('data1', true);
		
		if ((this.x < 0) || (this.x > W)) {
			this.xSpeed *= -1.0;
			this.onTouchBounds();
		}
		this.scale.x = this.xSpeed > 0 ? 1 : -1;
		super.update();
	}
	
	static get globalBunnysCount () {
		return 3;
	}
	
	onTouchBounds() {
		this.rotation = (Math.random() - 0.5) * 0.2;
	}
}

Bunny.getRandom = function() {
	return Math.random() * 300;
};

/// #if EDITOR
Bunny.EDITOR_group = "Custom/Bunnies";

/// #endif