import type { FileDesc } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';

const getHashedAssetName = (file: FileDesc) => {
	if (!file._hashedAssetName) {
		const hash = fs.getFileHash(file.fileName);
		if (file.assetType === AssetType.IMAGE || file.assetType === AssetType.FONT) {
			const n = file.assetName.lastIndexOf('.');
			file._hashedAssetName = file.assetName.substring(0, n) + '_' + hash + file.assetName.substring(n);
		} else {
			file._hashedAssetName = file.assetName + '_' + hash;
		}
	}
	return file._hashedAssetName;
};

export default getHashedAssetName;
