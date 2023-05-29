import type { Classes, KeyedObject, SourceMappedConstructor } from "thing-editor/src/editor/env";
import game from "../engine/game";

import wrapPropertyWithNumberChecker from "thing-editor/src/editor/utils/number-checker";
import Lib from "thing-editor/src/engine/lib";
import fs, { AssetType, FileDescClass } from "./fs";
import { EditablePropertyDesc, EditablePropertyType, _editableEmbed, propertyAssert } from "./props-editor/editable";

import { Container, DisplayObject, Sprite, Text } from "pixi.js";
import { Constructor } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import { clearPropertyDifinitionCache } from "thing-editor/src/editor/ui/props-editor/get-property-definition-url";
import PropsEditor from "thing-editor/src/editor/ui/props-editor/props-editor";
import SelectEditor from "thing-editor/src/editor/ui/props-editor/props-editors/select-editor";
import Scene from "thing-editor/src/engine/components/scene.c";

const EMBED_CLASSES_NAMES_FIXER: Map<Constructor, string> = new Map();
EMBED_CLASSES_NAMES_FIXER.set(Container, 'Container');
EMBED_CLASSES_NAMES_FIXER.set(Sprite, 'Sprite');
EMBED_CLASSES_NAMES_FIXER.set(Text, 'Text');
//TODO: Mesh, BitmapText

//TODO

let componentsVersion = Date.now();

const NOT_SERIALIZABLE_PROPS_TYPES: Set<EditablePropertyType> = new Set();
NOT_SERIALIZABLE_PROPS_TYPES.add('btn');
NOT_SERIALIZABLE_PROPS_TYPES.add('ref');
NOT_SERIALIZABLE_PROPS_TYPES.add('splitter');

export default class ClassesLoader {

	static isClassesWaitsReloading: boolean;

	static async reloadClasses(): Promise<Classes | undefined> {

		componentsVersion++;

		let files = fs.getAssetsList(AssetType.CLASS) as FileDescClass[];
		this.isClassesWaitsReloading = false;
		return Promise.all(files.map((file) => {

			const onClassLoaded = (module: { default: SourceMappedConstructor }) => {

				const RawClass = module.default;
				if(!RawClass || !(RawClass.prototype instanceof DisplayObject)) {
					game.editor.editSource(file.fileName);
					if(!RawClass) {
						game.editor.showError('file ' + file.fileName + ' exports empty statement: ' + RawClass);
					} else {
						game.editor.showError('file ' + file.fileName + ' exports class which does not extend PIXI.Container: ' + RawClass.name);
					}
					return;
				}

				const Class: SourceMappedConstructor = RawClass;

				let instance: Container = new Class() as Container;

				let className: string = EMBED_CLASSES_NAMES_FIXER.has(Class) ? (EMBED_CLASSES_NAMES_FIXER.get(Class) as string) : Class.name;
				Class.__className = className;
				if(className === "_MovieClip") {
					console.error("_MovieClip");
				}
				file.asset = Class;

				Class.__sourceFileName = file.fileName;
				Class.__defaultValues = {};

				Class.__isScene = (instance instanceof Scene);

				if(!Class.__editableProps) {
					Class.__editableProps = [];
				}
				const editableProps: EditablePropertyDesc[] = Class.__editableProps;
				for(let prop of editableProps) {
					prop.class = Class;
					if(!prop.hasOwnProperty('type')) {
						let type = typeof (instance as KeyedObject)[prop.name];
						propertyAssert(prop, prop.override || type === 'string' || type === 'number' || type === 'boolean', 'can not detect type for editable property ' + prop.name);
						//@ts-ignore
						prop.type = type || 'number';
					}

					if(prop.name.startsWith('___')) {
						prop.notSerializable = true;
					}

					if(prop.hasOwnProperty('min')) {
						propertyAssert(prop, prop.type === 'number', "'min' attribute possible for properties with 'number' type only.");
						propertyAssert(prop, typeof prop.min === 'number', "'min' attribute should have number value.");
					}
					if(prop.hasOwnProperty('max')) {
						propertyAssert(prop, prop.type === 'number', "'max' attribute possible for properties with 'number' type only.");
						propertyAssert(prop, typeof prop.max === 'number', "'max' attribute should have number value.");
					}
					if(prop.hasOwnProperty('step')) {
						propertyAssert(prop, prop.type === 'number', "'step' attribute possible for properties with 'number' type only.");
						propertyAssert(prop, typeof prop.step === 'number', "'step' attribute should have number value.");
					}

					if(!prop.noNullCheck && (prop.type === 'number' || prop.type === 'color')) {
						wrapPropertyWithNumberChecker(Class, prop.name);
						prop.__nullCheckingIsApplied = true;
					}

					if(NOT_SERIALIZABLE_PROPS_TYPES.has(prop.type) || prop.name.startsWith('___')) {
						prop.notSerializable = true;
					}

					if(!prop.notSerializable) {
						if(!prop.hasOwnProperty('default')) {
							prop.default = (instance as KeyedObject)[prop.name];
							if(!prop.default) {
								prop.default = PropsEditor.getDefaultForType(prop);
							}
							propertyAssert(prop, typeof prop.default !== 'undefined', "Editable property '" + prop.name + "' in class '" + Class.__className + "' has no default value.");
						}
						Class.__defaultValues[prop.name] = prop.default;
					}
					if(!prop.override) {
						if(prop.hasOwnProperty('select')) {
							prop.renderer = SelectEditor;
						} else {
							prop.renderer = PropsEditor.getRenderer(prop);
						}
					}
				}

				if((Class.__editableProps.length < 1) || (Class.__editableProps[0].type !== 'splitter')) {
					_editableEmbed(Class, className + '-splitter', {
						type: 'splitter',
						name: className,
						title: className,
						notSerializable: true
					});
					Class.__editableProps.unshift(Class.__editableProps.pop() as EditablePropertyDesc);
				};

				return Class;
			}
			const moduleName = '../../..' + file.fileName.replace(/\.ts$/, '');

			const versionQuery = file.fileName.startsWith('/thing-editor/src/engine/components/') ? undefined : ('?v=' + componentsVersion);
			return imp(moduleName, versionQuery).then(onClassLoaded);

		})).then((_classes: (SourceMappedConstructor | undefined)[]) => {
			let classes: Classes = {};

			for(let c of _classes as SourceMappedConstructor[]) {
				if(!c) {
					return;
				}
				const className = c.__className;
				clearPropertyDifinitionCache(c.__sourceFileName as string);

				if(classes[className]) {
					game.editor.editClassSource(c);
					game.editor.showError(R.div(null,
						'class ',
						R.b(null, className),
						'" (' + c.__sourceFileName + ') overrides existing class ',
						R.b(null, (classes[className].__sourceFileName)),
						'. Please change your class name.'), 30008);
				}
				classes[className] = c;

			}

			Lib._setClasses(classes);

			for(let c of _classes as SourceMappedConstructor[]) {
				//@ts-ignore
				let superClass = c.__proto__;
				const editableProps: EditablePropertyDesc[] = c.__editableProps;
				if(editableProps[0].name !== '__root-splitter') {
					const superProps: EditablePropertyDesc[] = [];
					while(superClass.__editableProps) {
						superProps.unshift.apply(superProps, superClass.__editableProps);
						Object.assign(c.__defaultValues, superClass.__defaultValues);
						if(superProps[0].name === '__root-splitter') {
							break;
						}
						superClass = superClass.__proto__;
					}
					c.__editableProps = editableProps.filter((thisProp: EditablePropertyDesc) => {
						let sameNamedPropIndex = superProps.findIndex((superProp: EditablePropertyDesc) => {
							return superProp.name === thisProp.name;
						});
						if(sameNamedPropIndex >= 0) {
							const superProp = superProps[sameNamedPropIndex];
							if(!thisProp.override) {
								game.editor.editSource(thisProp.__src);
								game.editor.ui.modal.showError('Redefinition of property "' + thisProp.name + '" at class ' + superClass.__className + '. Already defined at: ' + superProp, 40004);
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
					c.__editableProps.unshift.apply(c.__editableProps, superProps);
				}

				if(!c.hasOwnProperty('__EDITOR_icon')) {
					c.__EDITOR_icon = 'tree/game'; // TODO custom MovieClip icon if has timeline property
				}
			}

			return classes;
		});
	}

	static validateClasses() {
		//TODO
	}
}

// vite dynamic imports broke sourcemaps lines; Thats why import moved to separate file.
const imp = (moduleName: string, version: string | undefined) => {
	if(!version) {
		return import(/* @vite-ignore */ `/${moduleName}.ts`);
	} else {
		return import(/* @vite-ignore */ `/${moduleName}.ts${version}`)
	}
}