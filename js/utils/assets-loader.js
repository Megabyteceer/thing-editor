import game from "/thing-engine/js/game.js";
import Lib from "/thing-engine/js/lib.js";

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
	
	Lib.__clearAssetsLists();
	
	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	editor.fs.files.some((fn) => {
		if(fn.match(textureFiler)) {
			Lib.addTexture(fn.replace(textureNameCleaner, ''), game.resourcesPath + fn);
		}
	});

	Lib.__onAllAssetsLoaded(() => {
		tmp.forEach((image, o) => {
			o.image = image;
		});
		game.pixiApp.start();
		editor.ui.modal.hideSpinner();
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