import { Texture } from "pixi.js";
import fs, { AssetType, FileDescImage, FileDescPrefab, FileDescScene } from "thing-editor/src/editor/fs";
import Lib from "thing-editor/src/engine/lib";

export default class AssetsLoader {

	static async reloadAssets() {
		Lib.__clearAssetsLists();

		Lib.addTexture('EMPTY', Texture.EMPTY);
		Lib.addTexture('WHITE', Texture.WHITE);

		let scenesFiles = fs.getAssetsList(AssetType.SCENE) as FileDescScene[];
		for(const file of scenesFiles) {
			file.asset = fs.readJSONFile(file.fileName)
			Lib.scenes[file.assetName] = file.asset;
		}

		let prefabsFiles = fs.getAssetsList(AssetType.PREFAB) as FileDescPrefab[];
		for(const file of prefabsFiles) {
			(file).asset = fs.readJSONFile(file.fileName)
			Lib.prefabs[file.assetName] = file.asset;
		}

		let soundFiles = fs.getAssetsList(AssetType.SOUND);
		soundFiles.map((file) => {
			Lib.addSound(file.assetName, file.fileName);
		})

		let imagesFiles = fs.getAssetsList(AssetType.IMAGE) as FileDescImage[];

		return Promise.all(imagesFiles.map((file) => {
			Lib.addTexture(file.assetName, file.asset || file.fileName); //file.asset - WHITE EMPTY textures go directly instead of URL
		}));
	}
}