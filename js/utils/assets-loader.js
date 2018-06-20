import Lib from "/thing-engine/js/lib.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

}

const textureFiler = /^img\/.*\.(png|jpg)$/gm;
const textureNameCleaner = /^img\//gm;

const enumAssets = () => {

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
	
	Lib.__clearTexturesList();
	
	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	
	
	editor.fs.files.some((fn) => {
		if(fn.match(textureFiler)) {
			Lib.addTexture(fn.replace(textureNameCleaner, ''), editor.fs.gameFolder + fn);
		}
	});
	
	tmp.forEach((image, o) => {
		o.image = image;
	});
}

AssetsLoader.reloadAssets = (refreshFiles) => {
	
	if(refreshFiles) {
		editor.fs.refreshFiles().then(enumAssets);
	} else {
		enumAssets();
	}
}

export default AssetsLoader;