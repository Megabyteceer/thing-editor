import type { Container } from 'pixi.js';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import type { TimelineData } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip/field-player';
import L from 'thing-editor/src/engine/utils/l';
import makePathForKeyframeAutoSelect from './movie-clip-keyframe-select-path';

function validateObjectDataRecursive(objectData: SerializedObject, rootName: string) {
	if (rootName.startsWith('___')) {
		return;
	}
	if (objectData.c) {
		let objectsConstructor = game.classes[objectData.c];
		if (!objectsConstructor) {
			validationError('Unknown component ' + objectData.c + ' detected.', rootName, (o: Container) => {
				return o.__nodeExtendData.unknownConstructor === objectData.c;
			}, undefined, 99999);
		} else {
			if (objectsConstructor.__validateObjectData) {
				let result = objectsConstructor.__validateObjectData(objectData.p);
				if (result) {
					validationError(result.message, rootName, result.findObjectCallback, result.fieldName, result.errorCode, objectsConstructor);
				}
			}

			for (const field of objectsConstructor.__editableProps) {

				const values = [];
				const fieldNames = [];
				if (objectData.p.hasOwnProperty(field.name)) {
					values.push(objectData.p[field.name]);
					fieldNames.push(field.name);
				}
				if (objectData.p.timeline && field.type === 'image') {
					const f = (objectData.p.timeline as TimelineData).f.find(f => f.n === field.name);
					if (f) {
						for (const k of f.t) {
							values.push(k.v);
							fieldNames.push(makePathForKeyframeAutoSelect('timeline', f, k));
						}
					}
				}
				let i = 0;
				for (const value of values) {
					if (field.type === 'image') {
						const imageName = value;
						if (!fs.getFileByAssetName(imageName, AssetType.IMAGE)) {
							validationError('Invalid image \'' + imageName + '\'', rootName, (o: Container) => {
								if ((o as KeyedObject)[field.name] === imageName) {
									return true;
								}
								if (o instanceof MovieClip) {
									const f = o.timeline?.f.find(f => f.n === field.name);
									if (f) {
										return f.t.some(k => k.v === imageName);
									}
								}
							}, fieldNames[i], 99999, objectsConstructor);
						}
					} else if (field.type === 'sound') {
						const soundName = value;
						if (!fs.getFileByAssetName(soundName, AssetType.SOUND)) {
							validationError('Invalid sound \'' + soundName + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === soundName;
							}, field.name, 99999, objectsConstructor);
						}
					} else if (field.type === 'l10n') {
						const localizationKey = value;
						if (!L.has(localizationKey)) {
							validationError('Invalid localization key \'' + localizationKey + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === localizationKey;
							}, field.name, 99999, objectsConstructor);
						}
					} else if (field.type === 'prefab') {
						const prefabName = value;
						if (!fs.getFileByAssetName(prefabName, AssetType.PREFAB)) {
							validationError('Invalid prefab \'' + prefabName + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === prefabName;
							}, field.name, 99999, objectsConstructor);
						}
					}
					i++;
				}
			}
		}
	}
	if (objectData.hasOwnProperty(':')) {
		for (let child of objectData[':']!) {
			validateObjectDataRecursive(child, rootName);
		}
	}
}

function validationError(message: string, rootName: string, findObjectCallback: (o: Container) => boolean | undefined, fieldName?: string, errorCode = 99999, constructor?: SourceMappedConstructor) {
	const selectObject = (o: Container) => {
		game.editor.selection.select(o);
		if (fieldName) {
			game.editor.ui.propsEditor.selectField(fieldName);
		}
	};

	const findObject = () => {
		window.setTimeout(() => {
			if ((!constructor || (game.currentContainer instanceof constructor)) && findObjectCallback(game.currentContainer)) {
				selectObject(game.currentContainer);
			}
			game.currentContainer.forAllChildren((o) => {
				if ((!constructor || (o instanceof constructor)) && findObjectCallback(o)) {
					selectObject(o);
				}
			});
		}, 10);
	};

	game.editor.ui.status.error(message, errorCode, () => {
		if (Lib.prefabs[rootName]) {
			PrefabEditor.editPrefab(rootName);
			findObject();
		} else {
			game.editor.openScene(rootName);
			findObject();
		}
	});
}


export default validateObjectDataRecursive;
