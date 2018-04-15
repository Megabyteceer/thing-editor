class Scene extends PIXI.Container {
    constructor() {
        super();
        this.interactiveChildren = false;
    }

    onShow () {
        
    }

    onHide () {

    }

    update() {
       
    }

    onShowInner() {
        this.onShow();
    }

    onHideInner() {
        this.onHide();
    }
}

export default Scene;