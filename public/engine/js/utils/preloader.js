export default class Preloader {
	
	constructor() {
		this.onProgress = this.onProgress.bind(this);
		this.onComplete = this.onComplete.bind(this);
		this.update = this.update.bind(this);
		
		this.progress = 0;
		this.currentProgress = 0;
		this.speed = 0;
		
		game.pixiApp.ticker.add(this.update);
		
		PIXI.loader.onProgress.add(this.onProgress);
		PIXI.loader.onComplete.add(this.onComplete);
	}
	
	update() {
		this.speed += (this.progress - this.currentProgress) * 0.015;
		this.speed *= 0.9;
		this.currentProgress += this.speed;
		if(this.started && this.completed && this.currentProgress >= 99.9) {
			this.destroy();
		} else {
			document.getElementById('preloader-text').innerHTML = 'Loding ' + Math.round(this.currentProgress) + '%';
			document.getElementById('preloader-bar').style.width = (this.currentProgress) + '%';
		}
		
	}
	
	onProgress(ev) {
		this.progress = ev.progress;
	}
	
	destroy() {
		document.getElementById('preloader').remove();
		game.pixiApp.ticker.remove(this.update);
		this.callback();
	}
	
	onComplete() {
		this.completed = true;
		this.progress = 100;
	}
	
	
	
	start(callback) {
		this.callback = callback;
		this.started = true;
	}
}