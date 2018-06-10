import MainMenu from "../scenes/main-scene.js";

export default class Bunny extends DSprite {
	
	init() {
		this.gravity = 1;
	}
	
	update() {
		MainMenu.count++;
		this.vertexData[2] += Math.random();
		if (this.y > H - 25) {
			this.onTouchBounds();
			this.ySpeed = -Math.abs(this.ySpeed);
		} else if(this.y < 0) {
			this.y = 0;
			this.onTouchBounds();
			this.ySpeed *= -1;
		} else {
			this.ySpeed += this.gravity;
		}
		
		game.settings.setItem('data1', true);
		
		if (this.x < 0) {
			this.x = 0;
			this.onTouchBounds();
			this.xSpeed *= -1.0;
		}
		
		if (this.x > W) {
			this.x = W;
			this.onTouchBounds();
			this.xSpeed *= -1.0;
		}
		
		this.scale.x = this.xSpeed > 0 ? 1 : -1;
		super.update();
	}
	
	setGravity(v) {
		this.gravity = v;
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