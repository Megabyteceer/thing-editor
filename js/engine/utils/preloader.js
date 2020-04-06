import game from "../game.js";
import {stepTo} from "./utils.js";
import ResourceLoader from "./resource-loader.js";

export default class Preloader {
	
	constructor() {
		this.updatePreloader = this.updatePreloader.bind(this);
		
		this.currentProgress = 0;
		
		game.pixiApp.ticker.add(this.updatePreloader);
		
		ResourceLoader.preloader = this;
		this.complete = false;
		this.maxCount = 0;
	}
	
	updatePreloader() {
		this.preloaderText = this.preloaderText || document.getElementsByClassName('preloader-text')[0];
		this.preloaderBar = this.preloaderBar || document.getElementsByClassName('preloader-bar')[0];
		this.preloader = this.preloader || document.getElementsByClassName('preloader')[0];

		let progressCount = game.getLoadingCount();
		this.maxCount = Math.max(this.maxCount, progressCount);
		let progress = (this.maxCount - progressCount) / this.maxCount * 100.0;

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
		this.complete = this.texturesCompleted && progress >= 100 && this.started && this.currentProgress >= 100;
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
	}
	
	start(callback) {
		this.callback = callback;
		this.started = true;
	}
}