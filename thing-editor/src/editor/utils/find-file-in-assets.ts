import game from 'thing-editor/src/engine/game';
import fs from '../fs';

const findFileInAssets = (fileName:string) => {
	for (const assetsFolder of game.editor.assetsFoldersReversed) {
		const fullPath = assetsFolder + fileName;
		if (fs.exists(fullPath)) {
			return fullPath;
		}
	}
};

export default findFileInAssets;
