import { Texture } from "pixi.js";
import fs from "thing-editor/src/editor/fs";
import Lib from "thing-editor/src/engine/lib";

export default class AssetsLoader {

	static async reloadAssets() {
		Lib.__clearAssetsLists();

		Lib.addTexture('EMPTY', Texture.EMPTY);
		Lib.addTexture('WHITE', Texture.WHITE);

		let scenesFiles = fs.getFiles('s.json');
		for(const file of scenesFiles) {
			Lib.scenes[file.assetName.replace(/\.s\.json$/, '')] = fs.readJSONFile(file.fileName);
		}

		let imagesFiles = fs.getFiles(['.png', '.jpg', '.svg', '.webp']);
		return Promise.all(imagesFiles.map((file) => {
			Lib.addTexture(file.assetName, file.fileName);
		}));
	}
}