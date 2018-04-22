class Bunny extends Sprite {
    
    constructor(img){
        super(img);
        this.xSpeed = Math.random() * 30.0 - 15.0;
        this.x = Math.random() * W;
		this.y = Math.random() * H;
		this.gravity = Math.random()*0.15 + 0.83;
    }

    update () {
         if(this.y > H) {
            this.ySpeed *= -1;
             this.onTouchBounds();
        } else {
        	this.ySpeed += this.gravity;
        }

        if((this.x < 0) || (this.x > W)) {
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