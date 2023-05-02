


import assert from "../engine/debug/assert";
import game from "../engine/game";

import fs from "./fs";
import { EditablePropertyDesc } from "./props-editor/editable";

let componentsVersion = Date.now();

interface Constructor {
	new(): {
		[key: string]: any;
	};
	__sourceFileName: string;

}

export default class ClassesLoader {

	static reloadClasses() {
		componentsVersion++;
		let files = fs.readDir('.' + game.editor.currentGame + 'assets');
		Promise.all(files.filter(file => file.name.endsWith('.c.ts') || file.name.endsWith('.s.ts')).map((file) => {
			const moduleName = '../../../' + file.name.replace(/\.ts$/, '');
			return import(/* @vite-ignore */`/${moduleName}.ts?v=${componentsVersion}`).then((module) => {

				game.alert();
				const Class: Constructor = module.default;
				let instance = new Class();

				Class.__sourceFileName = file.name;
				const editableProps: EditablePropertyDesc[] = Class.prototype.__editableProps;
				for(let prop of editableProps) {

					if(!prop.hasOwnProperty('default')) {
						prop.default = instance[prop.name];
					}
					if(!prop.hasOwnProperty('type')) {
						let type = typeof instance[prop.name];
						assert(type === 'string' || type === 'number', 'invalid type "' + type + '" for editable property ' + prop.name);
						//@ts-ignore
						prop.type = type;
					}
				}
				return Class;
			});
		})).then((_classes) => {

		});

	}

}