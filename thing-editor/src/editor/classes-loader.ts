import wrapPropertyWithNumberChecker from 'thing-editor/src/editor/utils/number-checker';
import Lib from 'thing-editor/src/engine/lib';

import { Container, DisplayObject, Sprite, Text } from 'pixi.js';
import type { FileDescClass } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import R from 'thing-editor/src/editor/preact-fabrics';
import type { EditablePropertyDesc, EditablePropertyType } from 'thing-editor/src/editor/props-editor/editable';
import { _editableEmbed, propertyAssert } from 'thing-editor/src/editor/props-editor/editable';
import PropsEditor from 'thing-editor/src/editor/ui/props-editor/props-editor';
import SelectEditor from 'thing-editor/src/editor/ui/props-editor/props-editors/select-editor';
import { regenerateClassesTypings } from 'thing-editor/src/editor/utils/generate-editor-typings';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import ___GizmoArrow from 'thing-editor/src/engine/lib/assets/src/___system/gizmo-arrow.c';
import MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

const EMBED_CLASSES_NAMES_FIXER: Map<any, string> = new Map();
EMBED_CLASSES_NAMES_FIXER.set(Container, 'Container');
EMBED_CLASSES_NAMES_FIXER.set(Sprite, 'Sprite');
EMBED_CLASSES_NAMES_FIXER.set(Text, 'Text');
EMBED_CLASSES_NAMES_FIXER.set(___GizmoArrow, '___GizmoArrow');

let componentsVersion = Date.now();

const NOT_SERIALIZABLE_PROPS_TYPES: Set<EditablePropertyType> = new Set();
NOT_SERIALIZABLE_PROPS_TYPES.add('btn');
NOT_SERIALIZABLE_PROPS_TYPES.add('ref');
NOT_SERIALIZABLE_PROPS_TYPES.add('splitter');


export default class ClassesLoader {

	static isClassesWaitsReloading: boolean;

	static async reloadClasses(): Promise<GameClasses | undefined> {

		componentsVersion++;

		let files = fs.getAssetsList(AssetType.CLASS) as FileDescClass[];
		this.isClassesWaitsReloading = false;

		let oneClassNameFixed = false;

		return Promise.all(files.map((file): SourceMappedConstructor => {
			const onClassLoaded = (module: { default: SourceMappedConstructor }): SourceMappedConstructor => {
				const RawClass = module.default;
				if (!RawClass || !(RawClass.prototype instanceof DisplayObject)) {
					game.editor.editSource(file.fileName);
					if (!RawClass) {
						game.editor.showError('file ' + file.fileName + ' exports empty statement: ' + RawClass);
					} else {
						game.editor.showError('file ' + file.fileName + ' exports class which does not extend PIXI.Container: ' + RawClass.name);
					}
					game.editor.editSource(file.fileName);
					return null as any;
				}

				const Class: SourceMappedConstructor = RawClass;

				let instance: Container = new (Class as any)() as Container;

				let className: string = EMBED_CLASSES_NAMES_FIXER.has(Class) ? (EMBED_CLASSES_NAMES_FIXER.get(Class) as string) : Class.name;
				if (className.startsWith('_')) {
					if (
						(className.startsWith('_') && !file.fileName.includes('/_')) ||
						(className.startsWith('___') && !file.fileName.includes('/___')) ||
						(className.startsWith('__') && !file.fileName.includes('/__')) ||
						(className.startsWith('____') && !file.fileName.includes('/____'))
					) {
						oneClassNameFixed = true;
						className = className.substring(1);
					}
				}

				Class.__className = className;

				file.asset = Class;
				Class.__classAsset = file;

				Class.__sourceFileName = file.fileName;
				Class.__defaultValues = {};

				Class.__isScene = (instance instanceof Scene);

				if (!Class.hasOwnProperty('__editablePropsRaw')) {
					Class.__editablePropsRaw = [];
					assert(Class.hasOwnProperty('__editablePropsRaw'), 'Editable not own');
				}
				const editableProps: EditablePropertyDesc[] = Class.__editablePropsRaw;
				for (let prop of editableProps) {
					prop.class = Class;
					if (!prop.hasOwnProperty('type')) {
						let type = typeof (instance as KeyedObject)[prop.name];
						propertyAssert(prop, prop.override || type === 'string' || type === 'number' || type === 'boolean', 'can not detect type for editable property ' + prop.name);
						prop.type = type as EditablePropertyType;
					}

					if (prop.name.startsWith('___')) {
						prop.notSerializable = true;
					}

					if (!prop.noNullCheck && !prop.arrayProperty && (prop.type === 'number' || prop.type === 'color')) {
						wrapPropertyWithNumberChecker(Class, prop.name);
						prop.__nullCheckingIsApplied = true;
					}

					if (NOT_SERIALIZABLE_PROPS_TYPES.has(prop.type) || prop.name.startsWith('___')) {
						prop.notSerializable = true;
					}

					if (!prop.notSerializable) {
						if (!prop.hasOwnProperty('default')) {
							prop.default = (instance as KeyedObject)[prop.name];
							if (!prop.default) {
								prop.default = PropsEditor.getDefaultForType(prop);
							}
							if (Array.isArray(prop.default)) {
								prop.arrayProperty = true;
							}
							propertyAssert(prop, typeof prop.default !== 'undefined', 'Editable property \'' + prop.name + '\' in class \'' + Class.__className + '\' has no default value.');
						}
						Class.__defaultValues[prop.name] = prop.default;
					}

					if (prop.hasOwnProperty('min')) {
						propertyAssert(prop, prop.type === 'number', '\'min\' attribute possible for properties with \'number\' type only.');
						propertyAssert(prop, typeof prop.min === 'number', '\'min\' attribute should have number value.');
						propertyAssert(prop, prop.default >= prop.min!, 'default value ' + prop.default + ' is less that \'min\' attribute ' + prop.min);
					}
					if (prop.hasOwnProperty('max')) {
						propertyAssert(prop, prop.type === 'number', '\'max\' attribute possible for properties with \'number\' type only.');
						propertyAssert(prop, typeof prop.max === 'number', '\'max\' attribute should have number value.');
						propertyAssert(prop, prop.default <= prop.max!, 'default value ' + prop.default + ' is bigger that \'max\' attribute ' + prop.max);
					}
					if (prop.hasOwnProperty('step')) {
						propertyAssert(prop, prop.type === 'number', '\'step\' attribute possible for properties with \'number\' type only.');
						propertyAssert(prop, typeof prop.step === 'number', '\'step\' attribute should have number value.');
					}

					if (!prop.override) {
						if (prop.hasOwnProperty('select')) {
							prop.renderer = SelectEditor;
						} else {
							prop.renderer = PropsEditor.getRenderer(prop);
						}
					}
				}

				if ((Class.__editablePropsRaw.length < 1) || (Class.__editablePropsRaw[0].type !== 'splitter')) {
					_editableEmbed(Class, className + '-splitter', {
						type: 'splitter',
						name: className,
						title: className,
						notSerializable: true
					});
					Class.__editablePropsRaw.unshift(Class.__editablePropsRaw.pop() as EditablePropertyDesc);
				}

				return Class;
			};
			let moduleName = '../../..' + file.fileName.replace(/\.ts$/, '');

			const versionQuery = file.fileName.startsWith('/thing-editor/src/engine/lib/') ? undefined : ('?v=' + componentsVersion);
			if (versionQuery) {
				moduleName += '.ts' + versionQuery;
			}

			return imp(moduleName).then(onClassLoaded) as any;

		})).then((_classes: SourceMappedConstructor[]) => {

			let classes: GameClasses = {} as any;

			for (let c of _classes) {
				if (!c) {
					return;
				}
				const className = c.__className;

				if (classes[className]) {
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

			for (let c of _classes) {

				let superClass = c;

				const allProps: EditablePropertyDesc[] = [];
				while (superClass.__editablePropsRaw) {
					if (superClass.hasOwnProperty('__editablePropsRaw')) {
						allProps!.unshift.apply(allProps, superClass.__editablePropsRaw);
						Object.assign(c.__defaultValues, superClass.__defaultValues);
						if (allProps[0].name === '__root-splitter') {
							break;
						}
					}
					superClass = (superClass as any).__proto__;
				}

				const editableProps: EditablePropertyDesc[] = [];
				const existingProps: Set<string> = new Set();

				for (const thisProp of allProps) {
					if (existingProps.has(thisProp.name)) {
						const sameNamedPropIndex = editableProps.findIndex(p => p.name === thisProp.name);
						const existingProp = editableProps[sameNamedPropIndex];
						if (!thisProp.override) {
							game.editor.editSource(thisProp.__src);
							game.editor.ui.modal.showError('Redefinition of property "' + thisProp.name + '" at class ' + superClass.__className + '. Already defined at: ' + existingProp.__src, 40004);
						} else {

							editableProps[sameNamedPropIndex] = Object.assign({}, existingProp, thisProp);
							if (thisProp.hasOwnProperty('default')) {
								c.__defaultValues[thisProp.name] = thisProp.default;
							}
						}
					} else {
						editableProps.push(thisProp);
						existingProps.add(thisProp.name);
					}
				}

				c.__editableProps = editableProps;

				if (!c.hasOwnProperty('__EDITOR_icon')) {
					if (c.prototype instanceof MovieClip) {
						c.__EDITOR_icon = 'tree/movie-custom';
					} else {
						c.__EDITOR_icon = 'tree/game';
					}
				}
			}
			regenerateClassesTypings();
			if (!oneClassNameFixed) {
				game.editor.ui.status.warn('class name fixing and __className field is not necessary anymore.');
			}
			return classes;
		});
	}
}

// vite dynamic imports broke sourcemaps lines; Thats why import moved to the bottom of the file.
const imp = (moduleName: string) => {
	return import(/* @vite-ignore */ `${moduleName}.ts`);
};
