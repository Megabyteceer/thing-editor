
import type { Classes, KeyedMap, KeyedObject, Prefabs, Scenes, SerializedObject, SerializedObjectProps, SourceMappedConstructor } from "thing-editor/src/editor/env";

import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import { Container, Texture } from "pixi.js";
import RemoveHolder from "thing-editor/src/engine/utils/remove-holder";

import getValueByPath from "thing-editor/src/engine/utils/get-value-by-path";
import Pool from "thing-editor/src/engine/utils/pool";

import { __EDITOR_inner_exitPreviewMode } from "thing-editor/src/editor/utils/preview-mode";
import { checkForOldReferences, markOldReferences } from "thing-editor/src/editor/utils/old-references-detect";
import resetNodeExtendData from "thing-editor/src/editor/utils/reset-node-extend-data";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags";
import type { SelectComponentItem } from "thing-editor/src/editor/ui/selectComponent";
import { __UnknownClass, __UnknownClassScene } from "thing-editor/src/editor/utils/unknown-class";

let classes: Classes;
let scenes: Scenes = {};
let prefabs: Prefabs = {};
let staticScenes: KeyedMap<Scene>;
let textures: KeyedMap<Texture> = {};

const removeHoldersToCleanup: RemoveHolder[] = [];


/// #if EDITOR

let __allTexturesNames: KeyedMap<boolean> = {};


/// #endif

export default class Lib {

	static loadScene(name: string): Scene { //TODO: rename to _loadsScene
		if(
			/// #if EDITOR
			!game.__EDITOR_mode &&
			/// #endif
			staticScenes.hasOwnProperty(name)) {
			return staticScenes[name];
		}
		let isSceneExists = scenes.hasOwnProperty(name);
		assert(isSceneExists, "No scene with name '" + name + "'", 10046);

		let s: Scene = _loadObjectFromData(scenes[name]) as Scene;
		s.__libSceneName = name;
		if(s.isStatic
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			staticScenes[name] = s;
		}
		return s;
	}

	static loadPrefab(name: string): Container {
		assert(prefabs.hasOwnProperty(name), "No prefab with name '" + name + "' registered in Lib", 10044);
		/// #if EDITOR
		if(name.indexOf(game.editor.editorFilesPrefix) !== 0) {
			prefabs[name].p.name = name;
		}
		/// #endif
		return _loadObjectFromData(prefabs[name]); // eslint-disable-line no-unreachable
	}

	static _setClasses(_classes: Classes) {
		classes = _classes;
		game.classes = _classes;
	}

	static scenes: Scenes;
	static prefabs: Prefabs;

	private static __isPrefabPreviewLoading = 0;
	static __outdatedReferencesDetectionDisabled = 0;

	static hasPrefab(name: string) {
		return prefabs.hasOwnProperty(name);
	}

	static hasScene(name: string) {
		return scenes.hasOwnProperty(name);
	}

	static hasTexture(name: string) {
		return textures.hasOwnProperty(name);
	}

	static _unloadTexture(name: string
		/// #if EDITOR
		, ___removeFromEditorList = false
		/// #endif
	) {


		//TODO:  текстуре переопределить ей базеТекстуру и рект на ивалид (EMPTY) не удалять из либы пусть будет инвалид невидимой

		let t = textures[name];
		if(!t) {
			return;
		}
		Texture.removeFromCache(t);
		t.destroy(true);
		delete textures[name];
		/// #if EDITOR
		if(___removeFromEditorList) {
			delete __allTexturesNames[name];
			let i = Lib.__texturesList.findIndex(i => i.name === name);
			assert(i >= 0, "cant find texture in  Lib.__texturesList", 90001);
			Lib.__texturesList.splice(i, 1);
		}
		/// #endif
	}

	static addTexture(name: string, textureURL: string | Texture
		/// #if EDITOR
		, addToBeginning = false
		/// #endif
	) {

		if(name !== 'EMPTY' && name !== 'WHITE') {
			if(Lib.hasTexture(name)) {
				Lib._unloadTexture(name);
			}
		}

		/// TODO: если текстура существовала - переопределить ей базеТекстуру и рект. Она была EMPTY инвалид

		/// #if EDITOR

		if(!__allTexturesNames.hasOwnProperty(name)) {
			if(addToBeginning) {
				Lib.__texturesList.splice(2, 0, { name, value: name });
			} else {
				Lib.__texturesList.push({ name, value: name });
			}
			__allTexturesNames[name] = true;
		} else if(addToBeginning) {
			let curIndex = Lib.__texturesList.findIndex(i => i.name === name);
			assert(curIndex > 0, "textures list is corrupted");
			let entry = Lib.__texturesList.splice(curIndex, 1);
			Lib.__texturesList.splice(2, 0, entry[0]);
		}
		/// #endif

		if(typeof textureURL === 'string') {
			textures[name] = Texture.from(textureURL);
		} else {
			textures[name] = textureURL;
		}

		// TODO применить сеттинги ассета к текстуре.

	}

	static getTexture(name: string
		/// #if EDITOR
		, _owner: Container
		/// #endif
	) {

		/// #if DEBUG
		if(!textures.hasOwnProperty(name)) {

			//TODO: load unloaded textures (load invalid (unloaded) texture. Потом тектуры будут выгружаться и инвалидиться не удалаясь из списка

			return Texture.WHITE;
		}
		/// #endif

		return textures[name];
	}

	static _getStaticScenes() {
		return staticScenes;
	}

	static _deserializeObject(src: SerializedObject
		/// #if EDITOR
		, isScene = false
		/// #endif
	): Container {
		let ret: Scene;
		/// #if EDITOR
		deserializationDeepness++;
		let replaceClass: SourceMappedConstructor | undefined = undefined;
		let replaceClassName: string | undefined;
		if(!classes.hasOwnProperty(src.c)) {
			replaceClass = (((Object.values(scenes).indexOf(src) >= 0) || isScene) ? __UnknownClassScene : __UnknownClass) as any as SourceMappedConstructor;
			replaceClassName = replaceClass.name;
			setTimeout(() => { // wait for id assign
				game.editor.logError("Unknown class " + src.c + " was replaced with class " + replaceClassName + ".", 32012, ret);
			}, 1);
		}
		if(!replaceClass) {
			assert(classes[src.c].__defaultValues, 'Class ' + (replaceClassName || src.c) + ' has no default values set');
		}
		/// #endif


		//TODO: prefabs references via src.p:

		const constrictor: SourceMappedConstructor =
			/// #if EDITOR
			replaceClass ||
			/// #endif
			classes[src.c] as SourceMappedConstructor;

		ret = Pool.create(constrictor);
		/// #if EDITOR
		if(ret.__beforeDeserialization) {
			ret.__beforeDeserialization();
		}
		if(replaceClassName) {
			ret.__nodeExtendData.unknownConstructor = src.c;
			ret.__nodeExtendData.unknownConstructorProps = src.p;
		}
		/// #endif
		Object.assign(ret, constrictor.__defaultValues, src.p);


		if(src.hasOwnProperty(':')) {
			let childrenData: SerializedObject[] = src[':'] as SerializedObject[];

			/// #if EDITOR
			if(!game.__EDITOR_mode) {
				childrenData = childrenData.filter(Lib._filterStaticTriggers);
			}
			/// #endif
			for(let childData of childrenData) {
				/// #if EDITOR

				let isVisible = game.__EDITOR_mode || !childData.p.hasOwnProperty('name') || !childData.p.name.startsWith('___');
				if(isVisible && Lib.__isPrefabPreviewLoading) {
					isVisible = !childData.p.hasOwnProperty('name') || !childData.p.name.startsWith('____'); //99999
				}
				if(isVisible) {
					/// #endif
					ret.addChild(Lib._deserializeObject(childData));
					/// #if EDITOR
				}
				/// #endif
			}
		}

		/// #if EDITOR

		deserializationDeepness--;
		if(deserializationDeepness === 0) {
			processAfterDeserialization(ret);
			ret.forAllChildren(processAfterDeserialization);
		}
		/// #endif

		return ret;
	}

	static destroyObjectAndChildren(o: Container, itsRootRemoving?: boolean) {
		/// #if EDITOR
		let extData = o.__nodeExtendData;
		__EDITOR_inner_exitPreviewMode(o);
		if(extData.constructorCalled) {

			EDITOR_FLAGS._root_onRemovedCalled = false;
			/// #endif
			//@ts-ignore
			o.onRemove();
			o._thing_initialized = false;
			/// #if EDITOR
			if(!EDITOR_FLAGS._root_onRemovedCalled) {
				game.editor.editClassSource(o);
			}
			assert(EDITOR_FLAGS._root_onRemovedCalled, "onRemove method without super.onRemove() detected in class '" + (o.constructor as SourceMappedConstructor).name + "'", 10045);
		}
		if(o.__beforeDestroy) {
			o.__beforeDestroy();
		}
		let needRefreshSelection = extData.isSelected;
		if(extData.isSelected) {
			game.editor.selection.remove(o);
		}
		/// #endif
		if(itsRootRemoving
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			let r = Pool.create(RemoveHolder);
			/// #if EDITOR
			constructRecursive(r);
			/// #endif
			let c = o.parent.children;
			c[c.indexOf(o)] = r;
			r.parent = o.parent;
			removeHoldersToCleanup.push(r);
			//@ts-ignore
			o.parent = null;
		} else {
			o.detachFromParent();
		}
		while(o.children.length > 0) {
			Lib.destroyObjectAndChildren(o.getChildAt(o.children.length - 1) as Container);
		}

		Pool.dispose(o);
		o.interactiveChildren = true;

		/// #if EDITOR
		delete o.___pathBreakpoint;
		resetNodeExtendData(o);
		if(needRefreshSelection) {
			game.editor.refreshTreeViewAndPropertyEditor();
		}
		markOldReferences(o);
		/// #endif
	}

	static _filterStaticTriggers(childData: SerializedObject) {
		if(childData.c === 'StaticTrigger') {
			return childData.p.invert !== !getValueByPath(childData.p.dataPath || game.classes.StaticTrigger.__defaultValues.dataPath, game);
		} else {
			return !childData[':'] || !childData[':'].some((cd) => {
				return (cd.c === 'StaticTrigger') && (!!cd.p.invert !== !getValueByPath(cd.p.dataPath || game.classes.StaticTrigger.__defaultValues.dataPath, game));
			});
		}
	}

	static _cleanupRemoveHolders() {
		while(removeHoldersToCleanup.length > 0) {
			Lib.destroyObjectAndChildren(removeHoldersToCleanup.pop() as Container);
		}
	}

	/// #if EDITOR

	static __serializeObject(o: Container) {

		__EDITOR_inner_exitPreviewMode(o);
		if(o.__beforeSerialization) {
			o.__beforeSerialization();
		}

		let ret: SerializedObject | undefined;
		if(!game.editor.disableFieldsCache) {
			ret = o.__nodeExtendData.serializationCache;
		}
		if(!ret) {
			let props: KeyedObject = {};
			let propsList = o.__editableProps;

			for(let p of propsList) {
				if(!p.notSerializable) {
					let val = (o as KeyedObject)[p.name];
					if((val != p.default) && (typeof val !== 'undefined') && (val !== null)) {
						if(p.type === 'rect') {
							props[p.name] = {
								x: val.x,
								y: val.y,
								w: val.w,
								h: val.h
							};
						} else {
							props[p.name] = val;
						}
					}
				}
			}

			ret = {
				c: (o.constructor as SourceMappedConstructor).name as string,
				p: props
			};

			if(o.__nodeExtendData.unknownConstructor) {
				ret.c = o.__nodeExtendData.unknownConstructor;
				ret.p = Object.assign(o.__nodeExtendData.unknownConstructorProps as SerializedObjectProps, ret.p);
			}

			if(o.children.length > 0) {
				let children = (o.children as Container[]).filter(__isSerializableObject).map(Lib.__serializeObject as () => SerializedObject);
				if(children.length > 0) {
					ret[':'] = children;
				}
			}
			o.__nodeExtendData.serializationCache = ret;
		}

		if(o.__afterSerialization) {
			o.__afterSerialization(ret);
		}

		return ret;
	}

	static __clearAssetsLists() {
		textures = {};
		Lib.__texturesList = [];
		__allTexturesNames = {};
	}

	static __invalidateSerializationCache(o: Container) {
		let p = o;
		while((p !== game.stage) && p) {
			p.__nodeExtendData.serializationCache = undefined;
			p = p.parent;
		}
	}

	static __deleteScene(_sceneName: string) {
		//TODO:
	}

	static __texturesList: SelectComponentItem[] = [];
	/// #endif
}

const __isSerializableObject = (o: Container) => {
	let exData = o.__nodeExtendData;
	return !exData.hidden && !exData.noSerialize;
};

let deserializationDeepness = 0;

const _loadObjectFromData = (src: SerializedObject): Container => {
	let ret = Lib._deserializeObject(src);

	/// #if EDITOR
	if(!game.__EDITOR_mode) {
		/// #endif
		constructRecursive(ret);
		/// #if EDITOR
	}
	/// #endif

	return ret;
};

let constructRecursive = (o: Container) => {
	assert(!game.__EDITOR_mode, "initialization attempt in editing mode.");

	if(o._thing_initialized) {
		return;
	}
	o._thing_initialized = true;

	/// #if EDITOR
	let extData = o.__nodeExtendData;
	assert(!extData.constructorCalled, "init() method was already called for object " + o.___info, 90001);

	EDITOR_FLAGS._root_initCalled = false;
	/// #endif

	//@ts-ignore
	o.init();

	///#if EDITOR
	checkForOldReferences(o);
	if(!EDITOR_FLAGS._root_initCalled) {
		game.editor.editClassSource(o);
		assert(false, "Class " + (o.constructor as SourceMappedConstructor).name + " overrides init method without super.init() called.", 10042);
	}

	extData.constructorCalled = true;
	///#endif

	let a: Container[] = o.children as Container[];
	let arrayLength = a.length;
	for(let i = 0; i < arrayLength; i++) {
		constructRecursive(a[i]);
	}
};

Lib.scenes = scenes;
Lib.prefabs = prefabs;

/// #if DEBUG
const processAfterDeserialization = (o: Container) => {
	if(o.__afterDeserialization) {
		o.__afterDeserialization();
	}
};

/// #endif