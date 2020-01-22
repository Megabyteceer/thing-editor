import game from "thing-engine/js/game.js";
import Lib from "thing-engine/js/lib.js";
import Sound from "thing-engine/js/utils/sound.js";
import BgMusic from "thing-engine/js/components/bg-music.js";
import TexturesView from "../ui/textures-view.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

};

const resourcesFilter =   /^img\/.*\.(xml|json)$/gmi;
const textureFiler = /^img\/.*\.(png|jpg)$/gmi;
const textureNameCleaner = /^img\//gm;

const enumAssets = (onlyThisFiles) => {

	game.pixiApp.stop();

	Sound.__stop();
	if(!onlyThisFiles) {
		Lib.__clearAssetsLists();
	}
	PIXI.Texture.EMPTY.__noIncludeInToBuild = true;
	PIXI.Texture.WHITE.__noIncludeInToBuild = true;
	Lib.addTexture('EMPTY', PIXI.Texture.EMPTY);
	Lib.addTexture('WHITE', PIXI.Texture.WHITE);
	
	let jsonFolders = [];

	editor.fs.filesExt.img.filter((fileStat) => {
		if(fileStat.name.match(resourcesFilter)) {
			if(!jsonFolders.some((f) => {
				return fileStat.name.startsWith(f);
			})) {
				let a = fileStat.name.split('/');
				a.pop();
				jsonFolders.push(a.join('/'));
			}
			if(!onlyThisFiles || onlyThisFiles.has(fileStat.name.replace(/^img\//, ''))) {
				Lib.addResource(fileStat.name, true);
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
					Lib.addTexture(imageId, game.resourcesPath + fileStat.name, !!onlyThisFiles, fileStat.lib);
				}
			}
		}
	});
	return new Promise((resolve) => {
		Lib.__onAllAssetsLoaded(() => {
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
			let i = Lib.__texturesList.findIndex(textureItem => textureItem.name === name);
			if(i >= 0) {
				Lib.__texturesList.splice(i, 1);
			}
		}
		if(Lib.resources.hasOwnProperty(name)) {
			delete(Lib.resources[name]);
			let i = Lib.__resourcesList.findIndex(item => item.name === name);
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