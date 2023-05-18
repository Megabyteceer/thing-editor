import { Texture } from "pixi.js";
import fs, { AssetType } from "thing-editor/src/editor/fs";
import Lib from "thing-editor/src/engine/lib";

export default class AssetsLoader {

	static async reloadAssets() {
		Lib.__clearAssetsLists();

		Lib.addTexture('EMPTY', Texture.EMPTY);
		Lib.addTexture('WHITE', Texture.WHITE);

		let scenesFiles = fs.getAssetsList(AssetType.SCENE);
		for(const file of scenesFiles) {
			Lib.scenes[file.assetName.replace(/\.s\.json$/, '')] = fs.readJSONFile(file.fileName);
		}

		let imagesFiles = fs.getAssetsList(AssetType.IMAGE);
		return Promise.all(imagesFiles.map((file) => {
			Lib.addTexture(file.assetName, file.fileName);
		}));
	}
}