import game from "../game.js";
import {stepTo} from "./utils.js";
import ResourceLoader from "./resource-loader.js";

export default class Preloader {
	
	constructor() {
		this.updatePreloader = this.updatePreloader.bind(this);
		
		this.texturesProgress = 0;
		this.currentProgress = 0;
		
		game.pixiApp.ticker.add(this.updatePreloader);
		
		ResourceLoader.preloader = this;
		this.complete = false;
	}
	
	updatePreloader() {
		this.preloaderText = this.preloaderText || document.getElementsByClassName('preloader-text')[0];
		this.preloaderBar = this.preloaderBar || document.getElementsByClassName('preloader-bar')[0];
		this.preloader = this.preloader || document.getElementsByClassName('preloader')[0];

		let soundsProgress = game.getLoadingProgress() * 100;
		let progress = (this.texturesProgress + soundsProgress) / 2.0;
		
		this.currentProgress = stepTo(this.currentProgress, progress, 2);
		if(this.preloaderText) {
			this.preloaderText.innerHTML = 'Loading ' + Math.round(this.currentProgress) + '%';
		}
		if(this.preloaderBar) {
			this.preloaderBar.style.width = (this.currentProgress) + '%';
		}
		if(this.complete) {
			this.destroy();
		}
		this.complete = this.texturesCompleted && soundsProgress >= 100 && this.started && this.currentProgress >= 100;
	}
	
	onProgress(progress) {
		this.texturesProgress = progress;
	}
	
	destroy() {
		if(this.preloader) {
			this.preloader.parentElement.removeChild(this.preloader);
		}
		game.pixiApp.ticker.remove(this.updatePreloader);
		this.callback();
	}
	
	onComplete() {
		this.texturesCompleted = true;
		this.texturesProgress = 100;
	}
	
	start(callback) {
		this.callback = callback;
		this.started = true;
	}
}