import game from "thing-engine/js/game.js";
import Lib from "thing-engine/js/lib.js";
import Sound from "thing-engine/js/utils/sound.js";
import BgMusic from "thing-engine/js/components/bg-music.js";
import TexturesView from "../ui/textures-view.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

};

const jsonFilter = /^img\/.*\.json$/gmi;
const textureFiler = /^img\/.*\.(png|jpg)$/gmi;
const textureNameCleaner = /^img\//gm;

const enumAssets = (onlyThisFiles) => {

	game.pixiApp.stop();

	let tmp = new Map();
	game.forAllChildrenEverywhere((o) => {
		if(o.image && (!onlyThisFiles || onlyThisFiles.has(o.image))) {
			tmp.set(o, o.image);
			o.image = 'EMPTY';
		}
	});
	
	for(let k of Lib.__texturesList) {
		if(k.name !== 'EMPTY' && k.name !== 'WHITE') {
			if(!onlyThisFiles || onlyThisFiles.has(k.name)) {
				if(Lib.hasTexture(k.name)) {
					Lib._unloadTexture(k.name);
				}
			}
		}
	}
	
	Sound.stop();
	if(!onlyThisFiles) {
		Lib.__clearAssetsLists();
	}

	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	let jsonFolders = [];

	editor.fs.filesExt.img.filter((fileStat) => {
		if(fileStat.name.match(jsonFilter)) {
			if(!jsonFolders.some((f) => {
				return fileStat.name.startsWith(f);
			})) {
				let a = fileStat.name.split('/');
				a.pop();
				jsonFolders.push(a.join('/'));
			}
			if(!onlyThisFiles || onlyThisFiles.has(fileStat.name)) {
				Lib.addResource(fileStat.name);
			}
		}
	});


	editor.fs.filesExt.img.some((fileStat) => {
		if(fileStat.name.match(textureFiler)) {
			if(!jsonFolders.some((f) => {
				return fileStat.name.startsWith(f);
			})) {
				let imageId = fileStat.name.replace(textureNameCleaner, '');
				if((!onlyThisFiles || onlyThisFiles.has(imageId))) {
					Lib.addTexture(imageId, game.resourcesPath + fileStat.name, true && onlyThisFiles);
				}
			}
		}
	});
	return new Promise((resolve) => {
		Lib.__onAllAssetsLoaded(() => {
			let emSave = game.__EDITOR_mode;
			game.__EDITOR_mode = true; //enforce update some type of components (tileGrid, fill);
			tmp.forEach((image, o) => {
				o.image = image;
			});
			game.__EDITOR_mode = emSave;

			game.pixiApp.start();
			editor.ui.modal.hideSpinner();
			BgMusic._recalculateMusic();
			TexturesView.applyFoldersPropsToAllImages();
			game.__loadDynamicTextures(onlyThisFiles);
			resolve();
			editor.refreshTexturesViewer();
		});
	});
};

AssetsLoader.deleteAssets = (assetsNames) => {
	for(let name of assetsNames) {
		if(Lib.hasTexture(name)) {
			Lib._unloadTexture(name, true);
			let i = Lib.__texturesList.find(textureItem => textureItem.name === name);
			i = Lib.__texturesList.indexOf(i);
			assert(i >= 0, "can not remove deleted texture: " + name);
			Lib.__texturesList.splice(i, 1);
		} else if(Lib.resources.hasOwnProperty(name)) {
			delete(Lib.resources[name]);
			let i = Lib.__resourcesList.indexOf(name);
			assert(i >= 0, "can not remove deleted resource: " + name);
			Lib.__resourcesList.splice(i, 1);
		}
	}
};

AssetsLoader.reloadAssets = (refreshFiles, onlyThisFiles = null) => {
	editor.ui.modal.showSpinner();
	if(refreshFiles) {
		return new Promise((resolve) => {
			editor.fs.refreshFiles().then(() => {
				enumAssets(onlyThisFiles).then(resolve);
			});
		});
	} else {
		return enumAssets(onlyThisFiles);
	}
};

export default AssetsLoader;