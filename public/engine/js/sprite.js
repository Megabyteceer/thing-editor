class Sprite extends PIXI.Sprite {
    constructor(pic) {
        super(pic);
        this.anchor.set(0.5);
        this.xSpeed = 0;
        this.ySpeed = 0;
    }

    update() {
       this.x += this.xSpeed;
       this.y += this.ySpeed;
    }
}

export default Sprite;