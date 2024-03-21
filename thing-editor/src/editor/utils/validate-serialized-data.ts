import type { Container } from 'pixi.js';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import L from 'thing-editor/src/engine/utils/l';

function validateObjectDataRecursive(objectData: SerializedObject, rootName: string) {
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

			} for (const field of objectsConstructor.__editableProps) {
				if (field.type === 'image') {
					if (objectData.p.hasOwnProperty(field.name)) {
						const imageName = objectData.p[field.name];
						if (!fs.getFileByAssetName(imageName, AssetType.IMAGE)) {
							validationError('Invalid image \'' + imageName + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === imageName;
							}, field.name, 99999, objectsConstructor);
						}
					}
				} else if (field.type === 'sound') {
					if (objectData.p.hasOwnProperty(field.name)) {
						const soundName = objectData.p[field.name];
						if (!fs.getFileByAssetName(soundName, AssetType.SOUND)) {
							validationError('Invalid sound \'' + soundName + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === soundName;
							}, field.name, 99999, objectsConstructor);
						}
					}
				} else if (field.type === 'l10n') {
					if (objectData.p.hasOwnProperty(field.name)) {
						const localizationKey = objectData.p[field.name];
						if (!L.has(localizationKey)) {
							validationError('Invalid localization key \'' + localizationKey + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === localizationKey;
							}, field.name, 99999, objectsConstructor);
						}
					}
				} else if (field.type === 'prefab') {
					if (objectData.p.hasOwnProperty(field.name)) {
						const prefabName = objectData.p[field.name];
						if (!fs.getFileByAssetName(prefabName, AssetType.PREFAB)) {
							validationError('Invalid prefab \'' + prefabName + '\'', rootName, (o: Container) => {
								return (o as KeyedObject)[field.name] === prefabName;
							}, field.name, 99999, objectsConstructor);
						}
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
}

function validationError(message: string, rootName: string, findObjectCallback: (o: Container) => boolean, fieldName?: string, errorCode = 99999, constructor?: SourceMappedConstructor) {
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
