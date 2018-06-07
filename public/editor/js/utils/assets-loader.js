import Lib from "/engine/js/lib.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

}

const textureFiler = /^img\/.*\.(png|jpg)$/gm;
const textureNameCleaner = /^img\//gm;

const enumAssets = () => {
	Lib.__clearTexturesList();
	let tmp = new Map();
	let a = game.pixiApp.stage.findChildrenByType(PIXI.Sprite);
	a.some((s) => {
		if(s.image) {
			tmp.set(s, s.image);
			s.image = 'EMPTY';
		}
	});
	
	for(let k of Lib.__texturesList) { //TODO: clear changed only
		let t = Lib.getTexture(k.name);
		if(t.textureCacheIds.length > 0) {
			for(let id of t.textureCacheIds) {
				delete(PIXI.utils.TextureCache[id]);
			}
			t.destroy(true);
		}
	}
	
	
	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	editor.fs.files.some((fn) => {
		if(fn.match(textureFiler)) {
			Lib.addTexture(fn.replace(textureNameCleaner, ''), editor.fs.gameFolder + fn);
		}
	});
	
	a.some((s) => {
		if(tmp.has(s)) {
			s.image = tmp.get(s);
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