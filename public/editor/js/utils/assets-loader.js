import Lib from "/engine/js/lib.js";

const AssetsLoader = {};

AssetsLoader.init = () => {
	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
}

const textureFiler = /^img\/.*\.png$/gm;
const textureNameCleaner = /^img\//gm;

const enumAssets = () => {
	editor.fs.files.some((fn) => {
		if(fn.match(textureFiler)) {
			Lib.addTexture(fn.replace(textureNameCleaner, ''), editor.fs.gameFolder + fn);
		}
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