import game from "thing-engine/js/game.js";
import Lib from "thing-engine/js/lib.js";
import Sound from "thing-engine/js/utils/sound.js";
import Pool from "thing-engine/js/utils/pool.js";
import BgMusic from "thing-engine/js/components/bg-music.js";
import TexturesView from "../ui/textures-view.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

};

const jsonFilter = /^img\/.*\.json$/gmi;
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
			if(Lib.hasTexture(k.name)) {
				Lib._unloadTexture(k.name);
			}
		}
	}
	
	Sound.stop();
	Lib.__clearAssetsLists();
	Pool.clearAll();

	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	let jsonFolders = [];

	editor.fs.filesExt.filter((fileStat) => {
		if(fileStat.name.match(jsonFilter)) {
			if(!jsonFolders.some((f) => {
				return fileStat.name.startsWith(f);
			})) {
				let a = fileStat.name.split('/');
				a.pop();
				jsonFolders.push(a.join('/'));
			}

			Lib.addResource(fileStat.name);
		}
	});


	editor.fs.filesExt.some((fileStat) => {
		if(fileStat.name.match(textureFiler)) {
			if(!jsonFolders.some((f) => {
				return fileStat.name.startsWith(f);
			})) {
				let imageId = fileStat.name.replace(textureNameCleaner, '');
				Lib.addTexture(imageId, game.resourcesPath + fileStat.name);
			}
		}
	});
	return new Promise((resolve) => {
		Lib.__onAllAssetsLoaded(() => {
			let emSave = game.__EDITORmode;
			game.__EDITORmode = true; //enforece update some type of components (tilegrid, fill);
			tmp.forEach((image, o) => {
				o.image = image;
			});
			game.__EDITORmode = emSave;

			game.pixiApp.start();
			editor.ui.modal.hideSpinner();
			BgMusic._recalculateMusic();
			TexturesView.applyFoldersPropsToAllImages();
			resolve();
			editor.refreshTexturesViewer();
		});
	});
};

AssetsLoader.reloadAssets = (refreshFiles) => {
	editor.ui.modal.showSpinner();
	if(refreshFiles) {
		return new Promise((resolve) => {
			editor.fs.refreshFiles().then(() => {
				enumAssets().then(resolve);
			});
		});
	} else {
		return enumAssets();
	}
};

export default AssetsLoader;