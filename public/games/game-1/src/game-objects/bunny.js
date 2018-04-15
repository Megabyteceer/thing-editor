class Bunny extends Sprite {
    
    constructor(img){
        super(img);
        this.xSpeed = Math.random() * 10.0 - 5.0;
        this.x = Math.random() * W;
		this.y = Math.random() * H;
		this.gravity = Math.random()*0.15 + 0.03;
    }

    update () {
         if(this.y > H) {
            this.ySpeed *= -1.0;
            this.rotation = Math.random() - 0.5;
        } else {
        	this.ySpeed += this.gravity;
        }

        if((this.x < 0) || (this.x > W)) {
            this.xSpeed *= -1.0;
            this.rotation = Math.random() - 0.5;
        }
        
        super.update();
    }
}

export default Bunny;