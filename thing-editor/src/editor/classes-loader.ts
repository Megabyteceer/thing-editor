


import type { Classes, KeyedMap, SourceMappedConstructor } from "thing-editor/src/editor/env";
import assert from "../engine/debug/assert";
import game from "../engine/game";

import fs from "./fs";
import { EditablePropertyDesc } from "./props-editor/editable";
import wrapPropertyWithNumberChecker from "thing-editor/src/editor/utils/number-checker";
import Lib from "thing-editor/src/engine/lib";

import R from "thing-editor/src/editor/preact-fabrics";
import { Container, DisplayObject, Sprite, Text } from "pixi.js";
import { Constructor } from "thing-editor/src/editor/env";

const EMBED_CLASSES_NAMES_FIXER: Map<Constructor, string> = new Map();
EMBED_CLASSES_NAMES_FIXER.set(Container, 'Container');
EMBED_CLASSES_NAMES_FIXER.set(Sprite, 'Sprite');
EMBED_CLASSES_NAMES_FIXER.set(Text, 'Text');
//TODO: Mesh, BitmapText

//TODO

let componentsVersion = Date.now();

let builtInClasses: KeyedMap<SourceMappedConstructor>;

export default class ClassesLoader {

	static async reloadClasses(isBuiltInClassesLoading = false): Promise<Classes | undefined> {

		if(!isBuiltInClassesLoading) {
			componentsVersion++;
		}
		let files = fs.getFiles('.c.ts');
		return Promise.all(files.map((file) => {

			const onLoad = (module: { default: SourceMappedConstructor }) => {

				const RawClass = module.default;
				if(!RawClass || !(RawClass.prototype instanceof DisplayObject)) {
					if(!RawClass) {
						game.editor.showError('file ' + file.fileName + ' exports empty statement: ' + RawClass);
					} else {
						game.editor.showError('file ' + file.fileName + ' exports class which does not extend PIXI.Container: ' + RawClass.name);
					}
					return;
				}

				const Class: SourceMappedConstructor = RawClass;

				let instance = new Class();

				Class.__sourceFileName = file.fileName;
				Class.__defaultValues = {};
				if(!Class.prototype.__editableProps) {
					Class.prototype.__editableProps = [];
				}
				const editableProps: EditablePropertyDesc[] = Class.prototype.__editableProps;
				for(let prop of editableProps) {

					prop.default = instance[prop.name];
					Class.__defaultValues[prop.name] = prop.default;

					if(!prop.hasOwnProperty('type')) {
						let type = typeof instance[prop.name];
						assert(type === 'string' || type === 'number' || type === 'boolean', 'invalid type "' + type + '" for editable property ' + prop.name);
						//@ts-ignore
						prop.type = type || 'number';
					}

					if(!prop.noNullCheck && (prop.type === 'number' || prop.type === 'color')) {
						wrapPropertyWithNumberChecker(Class, prop.name);
						prop.__nullCheckingIsApplied = true;
					}
				}

				return Class;
			};

			const moduleName = '../../..' + file.fileName.replace(/\.ts$/, '');

			if(isBuiltInClassesLoading) {
				return import(/* @vite-ignore */`/${moduleName}.ts`).then(onLoad);
			} else {
				const versionQuery = '?v=' + componentsVersion;
				return import(/* @vite-ignore */`/${moduleName}.ts${versionQuery}`).then(onLoad);
			}

		})).then((_classes: (SourceMappedConstructor | undefined)[]) => {
			let classes: Classes = {};
			if(!isBuiltInClassesLoading) {
				Object.assign(classes, builtInClasses);
			} else {
				assert(!builtInClasses, 'Built-in classes loaded already');
			}
			for(let c of _classes) {
				if(!c) {
					return;
				}

				let className: string = (isBuiltInClassesLoading && EMBED_CLASSES_NAMES_FIXER.has(c)) ? (EMBED_CLASSES_NAMES_FIXER.get(c) as string) : c.name;
				c.__className = className;

				if(classes[className]) {
					game.editor.showError(R.div(null,
						'class ',
						R.b(null, className),
						'" (' + c.__sourceFileName + ') overrides existing class ',
						R.b(null, (classes[className].__sourceFileName)),
						'. Please change your class name.'), 30008);
				}
				classes[className] = c;

			}
			if(isBuiltInClassesLoading) {
				builtInClasses = Object.assign({}, classes);
			}
			Lib._setClasses(classes);
			return classes;
		});
	}
}