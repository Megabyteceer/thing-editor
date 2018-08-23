import game from "/thing-engine/js/game.js";
import Lib from "/thing-engine/js/lib.js";
import Sound from "/thing-engine/js/utils/sound.js";
import Music from "/thing-engine/js/utils/music.js";
import Pool from "/thing-engine/js/utils/pool.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

};

const textureFiler = /^img\/.*\.(png|jpg)$/gmi;
const textureNameCleaner = /^img\//gm;

const enumAssets = () => {

	game.pixiApp.stop();

	let tmp = new Map();
	game.forAllChildrenEwerywhere((o) => {
		if(o.image) {
			tmp.set(o, o.image);
			o.image = 'EMPTY';
		}
	});
	
	for(let k of Lib.__texturesList) { //TODO: clear changed only
		if(k.name !== 'EMPTY' && k.name !== 'WHITE') {
			let t = Lib.getTexture(k.name);
			PIXI.Texture.removeFromCache(t);
			t.destroy(true);
		}
	}
	
	Sound.stop();
	Music.__resetAllMusics();
	Lib.__clearAssetsLists();
	Pool.clearAll();

	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	editor.fs.filesExt.some((fileStat) => {
		if(fileStat.name.match(textureFiler)) {
			Lib.addTexture(fileStat.name.replace(textureNameCleaner, ''), game.resourcesPath + fileStat.name);
		}
	});

	Lib.__onAllAssetsLoaded(() => {
		let emSave = game.__EDITORmode;
		game.__EDITORmode = true; //enforece update some type of components (tilegrid, fill);
		tmp.forEach((image, o) => {
			o.image = image;
		});
		game.__EDITORmode = emSave;

		game.pixiApp.start();
		editor.ui.modal.hideSpinner();

		if(!game.__EDITORmode) {
			if(game.currentScene) {
				game.currentScene._playMusic();
			}
		}
	});
};

AssetsLoader.reloadAssets = (refreshFiles) => {
	editor.ui.modal.showSpinner();
	if(refreshFiles) {
		editor.fs.refreshFiles().then(enumAssets);
	} else {
		enumAssets();
	}
};

export default AssetsLoader;