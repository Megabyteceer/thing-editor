


import type { Classes, KeyedMap, KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import assert from "../engine/debug/assert";
import game from "../engine/game";

import fs from "./fs";
import { EditablePropertyDesc, EditablePropertyType, _editableEmbed } from "./props-editor/editable";
import wrapPropertyWithNumberChecker from "thing-editor/src/editor/utils/number-checker";
import Lib from "thing-editor/src/engine/lib";

import R from "thing-editor/src/editor/preact-fabrics";
import { Container, DisplayObject, Sprite, Text } from "pixi.js";
import { Constructor } from "thing-editor/src/editor/env";
import imp from "thing-editor/src/editor/utils/imp";
import Scene from "thing-editor/src/engine/components/scene.c";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";

const EMBED_CLASSES_NAMES_FIXER: Map<Constructor, string> = new Map();
EMBED_CLASSES_NAMES_FIXER.set(Container, 'Container');
EMBED_CLASSES_NAMES_FIXER.set(Sprite, 'Sprite');
EMBED_CLASSES_NAMES_FIXER.set(Text, 'Text');
//TODO: Mesh, BitmapText

//TODO

let componentsVersion = Date.now();

let builtInClasses: KeyedMap<SourceMappedConstructor>;

const NOT_SERIALIZABLE_PROPS_TYPES: Set<EditablePropertyType> = new Set();
NOT_SERIALIZABLE_PROPS_TYPES.add('btn');
NOT_SERIALIZABLE_PROPS_TYPES.add('ref');
NOT_SERIALIZABLE_PROPS_TYPES.add('splitter');

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

				let instance: Container = new Class() as Container;

				Class.__sourceFileName = file.fileName;
				Class.__defaultValues = {};
				Class.__isScene = (instance instanceof Scene);

				if(!Class.prototype.__editableProps) {
					Class.prototype.__editableProps = [];
				}
				const editableProps: EditablePropertyDesc[] = Class.prototype.__editableProps;
				for(let prop of editableProps) {

					if(!prop.hasOwnProperty('type') && !prop.notSerializable) {
						let type = typeof (instance as KeyedObject)[prop.name];
						assert(type === 'string' || type === 'number' || type === 'boolean', 'invalid type "' + type + '" for editable property ' + prop.name);
						//@ts-ignore
						prop.type = type || 'number';
					}

					if(!prop.noNullCheck && (prop.type === 'number' || prop.type === 'color')) {
						wrapPropertyWithNumberChecker(Class, prop.name);
						prop.__nullCheckingIsApplied = true;
					}

					if(NOT_SERIALIZABLE_PROPS_TYPES.has(prop.type)) {
						prop.notSerializable = true;
					}

					if(!prop.notSerializable) {
						prop.default = (instance as KeyedObject)[prop.name];
						Class.__defaultValues[prop.name] = prop.default;
					}
					if(!prop.override) {
						prop.renderer = PropsEditor.getRenderer(prop.type);
					}
				}


				let className: string = (isBuiltInClassesLoading && EMBED_CLASSES_NAMES_FIXER.has(Class)) ? (EMBED_CLASSES_NAMES_FIXER.get(Class) as string) : Class.name;
				Class.__className = className;

				if((instance.__editableProps.length < 1) || (instance.__editableProps[0].type !== 'splitter')) {
					_editableEmbed(Class, className + '-splitter', {
						type: 'splitter',
						name: className,
						title: className,
						notSerializable: true
					});
				};

				return Class;
			}
			const moduleName = '../../..' + file.fileName.replace(/\.ts$/, '');

			const versionQuery = isBuiltInClassesLoading ? undefined : ('?v=' + componentsVersion);
			return imp(moduleName, versionQuery).then(onLoad);

		})).then((_classes: (SourceMappedConstructor | undefined)[]) => {
			let classes: Classes = {};
			if(!isBuiltInClassesLoading) {
				Object.assign(classes, builtInClasses);
			} else {
				assert(!builtInClasses, 'Built-in classes loaded already');
			}
			for(let c of _classes as SourceMappedConstructor[]) {
				if(!c) {
					return;
				}
				const className = c.__className;

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

			for(let c of _classes as SourceMappedConstructor[]) {
				//@ts-ignore
				let superClass = c.__proto__;
				const editableProps: EditablePropertyDesc[] = c.prototype.__editableProps;
				if(editableProps[0].name !== '__root-splitter') {
					const superProps: EditablePropertyDesc[] = [];
					while(superClass.prototype.__editableProps) {
						superProps.unshift.apply(superProps, superClass.prototype.__editableProps);
						Object.assign(c.__defaultValues, superClass.__defaultValues);
						superClass = superClass.__proto__;
					}
					c.prototype.__editableProps = editableProps.filter((thisProp: EditablePropertyDesc) => {
						let sameNamedPropIndex = superProps.findIndex((superProp: EditablePropertyDesc) => {
							return superProp.name === thisProp.name;
						});
						if(sameNamedPropIndex >= 0) {
							const superProp = superProps[sameNamedPropIndex];
							if(!thisProp.override) {
								game.editor.ui.modal.showError('Redefinition of property "' + thisProp.name + '" at class ' + superClass.__className + '. Already defined at: ' + superProp, 40004);
								game.editor.editClassSource(c as SourceMappedConstructor);
							} else {
								superProps[sameNamedPropIndex] = Object.assign({}, superProp, thisProp);
								if(thisProp.notSerializable) {
									delete c.__defaultValues[thisProp.name];
								}
							}
							return false;
						} else {
							return true;
						}
					});
					c.prototype.__editableProps.unshift.apply(c.prototype.__editableProps, superProps);
				}
			}

			return classes;
		});
	}
}