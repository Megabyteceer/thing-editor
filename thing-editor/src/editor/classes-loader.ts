


import type { Classes, SourceMappedConstructor } from "thing-editor/src/editor/env";
import assert from "../engine/debug/assert";
import game from "../engine/game";

import fs from "./fs";
import { EditablePropertyDesc } from "./props-editor/editable";
import wrapPropertyWithNumberChecker from "thing-editor/src/editor/utils/number-checker";
import Lib from "thing-editor/src/engine/lib";
import DisplayObject from "thing-editor/src/engine/display-object";

let componentsVersion = Date.now();

export default class ClassesLoader {

	static async reloadClasses(cached = false): Promise<Classes | undefined> {
		componentsVersion++;
		let files = fs.getFiles('.c.ts');
		return Promise.all(files.map((file) => {
			const moduleName = '../../../' + file.name.replace(/\.ts$/, '');
			const versionQuery = cached ? '' : '?v=' + componentsVersion;

			return import(/* @vite-ignore */`/${moduleName}.ts${versionQuery}`).then((module) => {

				const RawClass: SourceMappedConstructor = module.default;
				if(!RawClass || !(RawClass.prototype instanceof DisplayObject)) {
					if(!RawClass) {
						game.editor.showError('file ' + file.name + ' exports empty statement: ' + RawClass);
					} else {
						game.editor.showError('file ' + file.name + ' exports class which does not extend PIXI.DisplayObject: ' + RawClass.name);
					}
					return;
				}

				const Class: SourceMappedConstructor = RawClass;

				let instance = new Class();

				Class.__sourceFileName = file.name;
				Class.__defaultValues = {};

				const editableProps: EditablePropertyDesc[] = Class.prototype.__editableProps;
				for(let prop of editableProps) {

					prop.default = instance[prop.name];
					Class.__defaultValues[prop.name] = prop.default;

					if(!prop.hasOwnProperty('type')) {
						let type = typeof instance[prop.name];
						assert(type === 'string' || type === 'number', 'invalid type "' + type + '" for editable property ' + prop.name);
						//@ts-ignore
						prop.type = type || 'number';
					}

					if(!prop.noNullCheck && (prop.type === 'number' || prop.type === 'color')) {
						wrapPropertyWithNumberChecker(Class, prop.name);
						prop.__nullCheckingIsApplied = true;
					}
				}

				return Class;
			});
		})).then((_classes: (SourceMappedConstructor | undefined)[]) => {
			let classes: Classes = {};
			for(let c of _classes) {
				if(!c) {
					return;
				}
				classes[c.name] = c;
			}
			Lib._setClasses(classes);
			return classes;
		});
	}
}