import game from "thing-editor/js/engine/game.js";
import Lib from "thing-editor/js/engine/lib.js";
import Sound from "thing-editor/js/engine/utils/sound.js";
import BgMusic from "thing-editor/js/engine/components/bg-music.js";
import TexturesView from "../ui/textures-view.js";
import assert from "thing-editor/js/engine/utils/assert.js";

const AssetsLoader = {};

AssetsLoader.init = () => {

};

const atlasesFilter = /^img\/.*\.(atlas)$/gmi;
const resourcesFilter = /^img\/.*\.(xml|json)$/gmi;
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

	const jsonFolders = [];
	const checkIsInJsonFolder = (name) => {
		const containingFolderPath = name.substring(0, name.lastIndexOf('/'));
		return jsonFolders.indexOf(containingFolderPath) !== -1;
	};

	let resourcesToReload = {};
	let atlasesMap = {};

	editor.fs.filesExt.img.filter((fileStat) => {
		if(fileStat.name.match(resourcesFilter)) {
			if(!checkIsInJsonFolder(fileStat.name)) {
				let a = fileStat.name.split('/');
				a.pop();
				jsonFolders.push(a.join('/'));
			}
			if(!onlyThisFiles || onlyThisFiles.has(fileStat.name.replace(/^img\//, ''))) {
				resourcesToReload[fileStat.name] = true;
			}
		}

		if(fileStat.name.match(atlasesFilter)) {
			atlasesMap[fileStat.name] = true;
		}
	});

	if(onlyThisFiles) {
		for(let fn of onlyThisFiles) {
			fn = fn[0];
			for(let resName in Lib.resources) {
				let res = Lib.resources[resName];
				if(res.children.find((c) => {
					return c.url.endsWith('/img/' + fn);
				})) {
					resourcesToReload[res.name] = true;
				}
			}
		}
	}

	for(let name in resourcesToReload) {
		if(atlasesMap[name.slice(0, -5) + '.atlas']) {
			Lib.addResource(name, undefined, true);
		} else {
			Lib.addResource(name, {metadata: {spineAtlas: false}}, true);
		}
	}

	editor.fs.filesExt.img.some((fileStat) => {
		if(fileStat.name.match(textureFiler)) {
			if(!checkIsInJsonFolder(fileStat.name)) {
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
		let resourceName = 'img/' + name;
		if(Lib.resources.hasOwnProperty(resourceName)) {
			delete (Lib.resources[resourceName]);
			let i = Lib.__resourcesList.findIndex(item => item.name === resourceName);
			assert(i >= 0, "can not remove deleted resource: " + resourceName);
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
