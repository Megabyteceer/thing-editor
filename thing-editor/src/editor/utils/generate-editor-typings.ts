import fs from 'thing-editor/src/editor/fs';
import { getAllObjectRefsCount } from 'thing-editor/src/editor/utils/scene-all-validator';
import { __UnknownClass } from 'thing-editor/src/editor/utils/unknown-class';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';

let __currentAllMap: string;
let __currentClassesMap: string;

const getImportSrcForClass = (className: string) => {
	const path = game.classes[className].__sourceFileName!;
	return 'import type ' + className + ' from \'' + path.substring(1, path?.length - 3) + '\';';
};

const regenerateCurrentSceneMapTypings = () => {
	if (game.editor.editorArguments['no-vscode-integration']) {
		return;
	}
	if (!game.currentScene || !game.__EDITOR_mode) {
		return;
	}

	const json: KeyedMap<string> = {};
	const classes: Set<string> = new Set();


	game.currentScene._refreshAllObjectRefs();
	for (let n of Object.keys(game.currentScene.all)) {
		if (!n.startsWith('___')) {
			try {
				let className = (game.all[n].constructor as SourceMappedConstructor).__className;
				classes.add(className);
				json[n] = className;
			} catch (_er) { }
		}
	}
	let jsonString = JSON.stringify(json);
	if (__currentAllMap !== jsonString) {
		__currentAllMap = jsonString;

		let imports = [];
		let declarations = [];

		for (let className of classes.values()) {
			imports.push(getImportSrcForClass(className));
		}

		for (let name of Object.keys(json)) {
			let className = json[name];
			const isRefused = getAllObjectRefsCount(name);
			if (isRefused) {
				declarations.push(`/** @deprecated ${isRefused} */`);
			}
			declarations.push('\'' + name + '\': ' + ((className === 'Container') ? 'Container' : className) + ';');
		}

		let mapJS = `// thing-editor auto generated file.
import type Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';
import type { Container } from 'pixi.js';
`
			+ imports.join('\n') +
`

declare global {
type CurrentSceneType = ` + game.currentScene.constructor.name + `;

interface ThingSceneAllMap {
	[key: string]: Container;
`
			+ declarations.join('\n') + `
}
}
`;
		fs.writeFile('/thing-editor/src/editor/current-scene-typings.d.ts', mapJS);
	}
};


const regenerateClassesTypings = () => {
	if (game.editor.editorArguments['no-vscode-integration']) {
		return;
	}

	const classesNames: string[] = Object.keys(game.classes).filter(n => !n.startsWith('___'));

	let jsonString = classesNames.join(',');
	if (__currentClassesMap !== jsonString) {
		__currentClassesMap = jsonString;

		let imports = [];
		let declarations = [];

		for (let className of classesNames) {
			imports.push(getImportSrcForClass(className));
		}

		for (let className of classesNames) {
			declarations.push('\'' + className + '\': typeof ' + className + ';');
		}

		let mapJS = `// thing-editor auto generated file.

`
			+ imports.join('\n') +
`

declare global {

interface GameClasses {
[key: string]: typeof Constructor;
`
			+ declarations.join('\n') + `
}
}
`;
		fs.writeFile('/thing-editor/src/editor/current-classes-typings.d.ts', mapJS);
	}
};

let __currentPrefabsMap: string;

const regeneratePrefabsTypings = () => {

	if (game.editor.editorArguments['no-vscode-integration']) {
		return;
	}
	if (!game.currentScene || !game.__EDITOR_mode) {
		return;
	}
	let json: KeyedObject = {};
	let classes: Set<string> = new Set();

	for (let prefabName in Lib.prefabs) {
		if (!prefabName.startsWith('___')) {
			let className = getSerializedObjectClass(Lib.prefabs[prefabName]).__className;
			json[prefabName] = className;
			classes.add(className);
		}
	}

	let jsonString = JSON.stringify(json);
	if (__currentPrefabsMap !== jsonString) {
		__currentPrefabsMap = jsonString;

		let imports = [];
		let declarations = [];

		for (let prefabName in json) {
			declarations.push('	static loadPrefab(prefabName: \'' + prefabName + '\'):' + json[prefabName] + ';');
		}

		for (let className of classes.values()) {
			imports.push(getImportSrcForClass(className));
		}

		let mapJS = `// thing-editor auto generated file.
`
			+ imports.join('\n') +
			`
export default class TLib {
`
			+ declarations.join('\n') + `
	static loadPrefab(prefabName: string): Container;
	static loadPrefab(prefabName: string): Container {
		return prefabName as any;
	}
}
`;

		fs.writeFile('/thing-editor/src/editor/prefabs-typing.ts', mapJS);
	}
};

const getSerializedObjectClass = (data: SerializedObject): SourceMappedConstructor => {
	if (!data) {
		return __UnknownClass as SourceMappedConstructor;
	}
	if (data.r) {
		return getSerializedObjectClass(Lib.prefabs[data.r]);
	}
	return game.classes[data.c!] || __UnknownClass;
};

export default regenerateCurrentSceneMapTypings;

export { getSerializedObjectClass, regenerateClassesTypings, regeneratePrefabsTypings };

