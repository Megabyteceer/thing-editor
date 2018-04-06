class Bunny extends Sprite {
    
    constructor(img){
        super(img);
        this.xSpeed = Math.random() * 2.0 - 1.0;
        this.x = Math.random() * W;
		this.y = Math.random() * H;
    }

    update () {
        this.ySpeed += 0.01;
        if(this.y > H){
            this.ySpeed *= -1.0;
            this.rotation = Math.random() - 0.5;
        }

        if((this.x < 0) || (this.x > W)) {
            this.xSpeed *= -1.0;
        }

        super.update();
    }

}

export default Bunny;