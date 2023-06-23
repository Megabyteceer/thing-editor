import { KeyedMap, SourceMappedConstructor } from "thing-editor/src/editor/env";
import fs from "thing-editor/src/editor/fs";
import { getAllObjectRefsCount } from "thing-editor/src/editor/utils/scene-all-validator";
import game from "thing-editor/src/engine/game";

let __currentAllMap: string;

const regenerateCurrentSceneMapTypings = () => {
	if(game.editor.editorArguments['no-vscode-integration']) {
		return;
	}
	if(!game.currentScene || !game.__EDITOR_mode) {
		return;
	}

	const json: KeyedMap<string> = {};
	const classes: Set<string> = new Set();


	game.currentScene._refreshAllObjectRefs();
	for(let n of Object.keys(game.currentScene.all)) {
		try {
			let className = (game.all[n].constructor as SourceMappedConstructor).__className;
			classes.add(className);
			json[n] = className;
		} catch(er) { } // eslint-disable-line no-empty
	}
	let jsonString = JSON.stringify(json);
	if(__currentAllMap !== jsonString) {
		__currentAllMap = jsonString;

		let imports = [];
		let declarations = [];

		for(let className of classes.values()) {
			const path = game.classes[className].__sourceFileName!;
			imports.push('import ' + className + ' from "' + path.substring(1, path?.length - 3) + '";');
		}

		for(let name of Object.keys(json)) {
			let className = json[name];
			const isRefused = getAllObjectRefsCount(name);
			if(isRefused) {
				declarations.push(`/** @deprecated ${isRefused} */`);
			}
			declarations.push('"' + name + '":' + ((className === 'Container') ? 'Container' : className) + ';');
		}

		let mapJS = `// thing-editor auto generated file.

import { Container } from "pixi.js";
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
		fs.writeFile('/thing-editor/src/current-scene-typings.d.ts', mapJS);
	}
}

export default regenerateCurrentSceneMapTypings;