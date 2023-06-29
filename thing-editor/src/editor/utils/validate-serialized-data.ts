import { Container } from "pixi.js";
import { SerializedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import game from "thing-editor/src/engine/game";
import Lib from "thing-editor/src/engine/lib";

function validateObjectDataRecursive(objectData: SerializedObject, rootName: string) {
	if(objectData.c) {
		let objectsConstructor = game.classes[objectData.c];
		if(!objectsConstructor) {
			validationError("Unknown component " + objectData.c + " detected.", rootName, (o: Container) => {
				return o.__nodeExtendData.unknownConstructor === objectData.c;
			}, undefined, 99999);
		} else if(objectsConstructor.__validateObjectData) {
			let result = objectsConstructor.__validateObjectData(objectData.p);
			if(result) {
				validationError(result.message, rootName, result.findObjectCallback, result.fieldName, result.errorCode, objectsConstructor);
			}
		}

		if(objectData.hasOwnProperty(':')) {
			for(let child of objectData[':']!) {
				validateObjectDataRecursive(child, rootName);
			}
		}
	}
}

function validationError(message: string, rootName: string, findObjectCallback: (o: Container) => boolean, fieldName?: string, errorCode = 99999, constructor?: SourceMappedConstructor) {
	const selectObject = (o: Container) => {
		game.editor.selection.select(o);
		if(fieldName) {
			game.editor.ui.propsEditor.selectField(fieldName);
		}
	};

	const findObject = () => {
		setTimeout(() => {
			if((!constructor || (game.currentContainer instanceof constructor)) && findObjectCallback(game.currentContainer)) {
				selectObject(game.currentContainer);
			}
			game.currentContainer.forAllChildren((o) => {
				if((!constructor || (o instanceof constructor)) && findObjectCallback(o)) {
					selectObject(o);
				}
			});
		}, 10);
	};

	game.editor.ui.status.error(message, errorCode, () => {
		if(Lib.prefabs[rootName]) {
			PrefabEditor.editPrefab(rootName);
			findObject();
		} else {
			game.editor.openScene(rootName);
			findObject();
		}
	});
}


export default validateObjectDataRecursive;