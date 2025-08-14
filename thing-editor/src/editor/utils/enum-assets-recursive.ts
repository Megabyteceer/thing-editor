import type { FileDesc } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import L from 'thing-editor/src/engine/utils/l';

const addImageToAssetsList = (imageName: string, ret: Set<FileDesc>) => {
	if (imageName) {
		const file = fs.getFileByAssetName(imageName, AssetType.IMAGE);
		assert(file, 'Wrong image name.');
		if (!Lib.__isSystemTexture(file.asset, file.assetName)) {
			ret.add(file);
		}
	}
};

const addResourceToAssetsList = (resourceName: string, ret: Set<FileDesc>) => {
	if (resourceName) {
		const file = fs.getFileByAssetName(resourceName, AssetType.RESOURCE);
		assert(file, 'Wrong resource name.');
		ret.add(file);
	}
};

const addSoundToAssetsList = (soundName: string, ret: Set<FileDesc>) => {
	if (soundName) {
		const file = fs.getFileByAssetName(soundName, AssetType.SOUND);
		assert(file, 'Wrong sound name.');
		ret.add(file);
	}
};

const addPrefabToAssetsList = (prefabName: string, ret: Set<FileDesc>) => {
	if (prefabName) {
		const file = fs.getFileByAssetName(prefabName, AssetType.PREFAB);
		assert(file, 'Wrong prefab name.');
		if (!ret.has(file)) {
			ret.add(file);

			enumAssetsPropsRecursive(Lib.prefabs[prefabName], ret);
		}
	}
};

const enumAssetsPropsRecursive = (o: SerializedObject, ret: Set<FileDesc>) => {
	if (o.c) {
		const constr = game.classes[o.c];

		let props = constr.__editableProps;
		let imageFields: KeyedMap<true> = {};
		for (let field of props) {
			if (field.type === 'image') {
				imageFields[field.name] = true;
				addImageToAssetsList(o.p[field.name], ret);
			} else if (field.type === 'resource') {
				addResourceToAssetsList(o.p[field.name], ret);
			} else if (field.type === 'prefab') {
				let prefabName = o.p[field.name];
				if (Lib.hasPrefab(prefabName)) {
					addPrefabToAssetsList(prefabName, ret);
				}
			} else if (field.type === 'sound') {
				let soundName = o.p[field.name];
				if (Lib.hasSound(soundName)) {
					addSoundToAssetsList(soundName, ret);
				}
			} else if (field.type === 'callback') {
				let action = o.p[field.name];
				if (action && action.indexOf(',') > 0) {

					let params = action.split(',');
					params.shift();
					for (let p of params) {
						if (p.endsWith('.png') || p.endsWith('.jpg')) {
							addImageToAssetsList(p, ret);
						}
					}
				}
			} else if (field.type === 'l10n') {
				let key = o.p[field.name];
				if (key && L.has(key)) {
					const entryTexts = {} as KeyedMap<string>;
					const lData = L.getData();
					for (const langId in lData) {
						entryTexts[langId] = lData[langId][key];
					}
					let array = [key, entryTexts] as L10nEntryAsset;
					let prefix = game.projectDesc.__localesNewKeysPrefix;
					if (prefix && key.startsWith(prefix)) {
						array.push(prefix);
					}

					ret.add({assetType: AssetType.L10N_ENTRY, asset: array, assetName: key, fileName: '', mTime: 0, lib: null});
				}
			}
		}
		if (((constr as any === game.classes.MovieClip) || (constr.prototype instanceof game.classes.MovieClip)) && o.p.timeline) {
			for (let f of o.p.timeline.f) {
				for (let keyframe of f.t) {
					if (imageFields[f.n]) {
						addImageToAssetsList(keyframe.v, ret);
					}
					let a = keyframe.a;
					if (a && (a.indexOf('Sound.play`') >= 0 || a.indexOf('Sound.playPitched`') >= 0)) {
						let sndName = a.split(',')[1];
						if (Lib.hasSound(sndName)) {
							addSoundToAssetsList(sndName, ret);
						}
					}
				}
			}
		}
	} else {
		addPrefabToAssetsList(o.r!, ret);
	}
	if (o[':']) {
		for (let c of o[':']) {
			enumAssetsPropsRecursive(c, ret);
		}
	}
};

export default enumAssetsPropsRecursive;
