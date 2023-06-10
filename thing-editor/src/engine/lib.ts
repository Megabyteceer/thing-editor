
import { Classes, KeyedMap, KeyedObject, NodeExtendData, Prefabs, Scenes, SerializedObject, SerializedObjectProps, SourceMappedConstructor } from "thing-editor/src/editor/env";

import { Container, Texture } from "pixi.js";
import Scene from "thing-editor/src/engine/components/scene.c";
import assert from "thing-editor/src/engine/debug/assert";
import game from "thing-editor/src/engine/game";
import RemoveHolder from "thing-editor/src/engine/utils/remove-holder";

import getValueByPath from "thing-editor/src/engine/utils/get-value-by-path";
import Pool from "thing-editor/src/engine/utils/pool";

import fs, { AssetType, FileDesc, FileDescImage, FileDescPrefab } from "thing-editor/src/editor/fs";
import { SelectEditorItem } from "thing-editor/src/editor/ui/props-editor/props-editors/select-editor";
import { editorUtils } from "thing-editor/src/editor/utils/editor-utils";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags";
import getPrefabDefaults, { invalidatePrefabDefaults } from "thing-editor/src/editor/utils/get-prefab-defaults";
import { checkForOldReferences, markOldReferences } from "thing-editor/src/editor/utils/old-references-detect";
import PrefabEditor from "thing-editor/src/editor/utils/prefab-editor";
import __refreshPrefabRefs from "thing-editor/src/editor/utils/refresh-prefabs";
import { __UnknownClass, __UnknownClassScene } from "thing-editor/src/editor/utils/unknown-class";
import HowlSound, { HowlSoundOptions } from "thing-editor/src/engine/HowlSound";

let classes: Classes;
let scenes: Scenes = {};
let prefabs: Prefabs = {};
let staticScenes: KeyedMap<Scene>;
let textures: KeyedMap<Texture> = {};
let soundsHowlers: KeyedMap<HowlSound> = {};

const removeHoldersToCleanup: RemoveHolder[] = [];

/// #if EDITOR

let __allTexturesNames: KeyedMap<boolean> = {};

/// #endif

export default class Lib {

	static REMOVED_TEXTURE: Texture;

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
		/// #if EDITOR
		if(!name.startsWith(game.editor.backupPrefix)) {
			scenes[name].p.name = name;
		}
		/// #endif
		let s: Scene = _loadObjectFromData(scenes[name]) as Scene;

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
		if(!name.startsWith(game.editor.backupPrefix)) {
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
	static __outdatedReferencesDetectionDisabled = false;

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

		Object.assign(t, textures.EMPTY);

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

			/// #if EDITOR
			game.additionalLoadingsInProgress++;
			if(textures[name] && textures[name].baseTexture !== Lib.REMOVED_TEXTURE.baseTexture && textures[name].baseTexture !== textures.EMPTY.baseTexture) {
				//TODO check if updated texture unloads old instance;
				Lib._unloadTexture(name);
			}

			const asset = fs.getFileByAssetName(name, AssetType.IMAGE) as FileDescImage;

			Texture.fromURL((asset && asset.v) ? (textureURL + '?v=' + asset.v) : textureURL).then((t) => {
				if(textures[name]) {

					Object.assign(textures[name], t);
				} else {
					textures[name] = t;
				}
				game.additionalLoadingsInProgress--;
			});
			/*
			/// #endif
			textures[name] = Texture.from(textureURL);;
			//*/

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

		/// #if EDITOR
		if(!textures.hasOwnProperty(name)) {
			textures[name] = Lib.REMOVED_TEXTURE.clone();
			return Texture.WHITE;
		}
		/// #endif

		return textures[name];
	}

	static _getStaticScenes() {
		return staticScenes;
	}

	static hasSound(soundId: string) {
		return soundsHowlers.hasOwnProperty(soundId);
	}

	static getSound(soundId: string, __dynamicPreloading = false) {
		assert(soundsHowlers.hasOwnProperty(soundId), "No sound with id '" + soundId + "' found.");
		let s = soundsHowlers[soundId];
		/// #if EDITOR
		if(!game.__EDITOR_mode) {
			if(s.state() === "unloaded") {
				game.editor.ui.status.error('Sound "' + soundId + '" is not preloaded. Please check-on preloading mode for this sound, or use Lib.preloadSound("' + soundId + '") in scene\`s onShow() method before using this sound.', 32008);
			} else if(!__dynamicPreloading && (s.state() === "loading")) {
				game.editor.ui.status.warn('Sound "' + soundId + '" preloading is not finished. Please preload sounds inside onShow method of scene, to automatic insurance of complete sounds preloading.', 32009);
			}
			Lib.preloadSound(soundId);
		}
		/// #endif
		return s;
	}

	static addSound(name: string, fileName: string) {

		//TODO duration
		//TODO preload
		let s = loadSound({ src: fileName });
		soundsHowlers[name] = s;

	}

	static preloadSound(soundId: string
		/// #if EDITOR
		//TODO , owner: BGMusic
		/// #endif
	) {
		if(soundId) {
			/// #if EDITOR
			if(!soundsHowlers.hasOwnProperty(soundId)) {
				game.editor.ui.status.error("No sound with id '" + soundId + "' found.", 10043/*, owner TODO*/);
				return;
			}
			/// #endif
			let s = soundsHowlers[soundId];
			if(s.state() === "unloaded") {
				s.load();
				return true;
			}
		}
	}

	static _deserializeObject(src: SerializedObject
		/// #if EDITOR
		, isScene = false
		/// #endif
	): Container {
		let ret: Container;

		/// #if EDITOR
		deserializationDeepness++;
		/// #endif

		if(src.hasOwnProperty('r')) { // prefab reference
			/// #if EDITOR
			let replacedPrefabName: string | undefined;
			if(!Lib.hasPrefab(src.r!)) {
				replacedPrefabName = src.r;
				src.r = '__system/unknown-prefab';
				if(!showedReplacings[src.r!]) {
					showedReplacings[src.r!] = true;
					setTimeout(() => { // wait for id assign
						game.editor.ui.status.error("Unknown prefab " + src.r + " was temporary replaced with empty Container.", 99999, ret);
					}, 1);
				}
			}
			/// #endif

			ret = Lib.loadPrefab(src.r!);
			Object.assign(ret, src.p);
			/// #if EDITOR

			if(replacedPrefabName) {
				ret.name = replacedPrefabName;
				ret.__nodeExtendData.unknownPrefab = replacedPrefabName;
				ret.__nodeExtendData.unknownPrefabProps = src.p;
			}
			__preparePrefabReference(ret, src.r!);
			/// #endif

		} else { // not a prefab reference

			/// #if EDITOR
			let replaceClass: SourceMappedConstructor | undefined = undefined;
			let replaceClassName: string | undefined;
			if(!classes.hasOwnProperty(src.c!)) {
				replaceClass = (((Object.values(scenes).indexOf(src) >= 0) || isScene) ? __UnknownClassScene : __UnknownClass) as any as SourceMappedConstructor;
				replaceClassName = replaceClass.__className;
				if(!showedReplacings[src.c!]) {
					showedReplacings[src.c!] = true;
					setTimeout(() => { // wait for id assign
						game.editor.ui.status.error("Unknown class " + src.c + " was temporary replaced with class " + replaceClassName + ".", 32012, ret);
					}, 1);
				}
			}
			if(!replaceClass) {
				assert(classes[src.c!].__defaultValues, 'Class ' + (replaceClassName || src.c) + ' has no default values set');
			}
			/// #endif

			const constrictor =
				/// #if EDITOR
				replaceClass ||
				/// #endif
				classes[src.c!] as SourceMappedConstructor;

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
		}

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
		editorUtils.exitPreviewMode(o);
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
			let r = Pool.create(RemoveHolder as any as SourceMappedConstructor);
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
		o.__nodeExtendData = EMPTY_NODE_EXTEND_DATA;
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

	static _loadClassInstanceById(id: string) {
		const Class = classes[id];
		let ret = Pool.create(Class);
		Object.assign(ret, Class.__defaultValues);

		/// #if EDITOR
		if(ret instanceof Scene) {
			//@ts-ignore
			ret.all = '"scene.all" is not initialized yet.';
		}
		if(!game.__EDITOR_mode) {
			/// #endif
			constructRecursive(ret);
			/// #if EDITOR
		}
		/// #endif
		return ret;
	}

	/// #if EDITOR

	static __clearStaticScenes() {
		for(let sceneName in staticScenes) {
			let s = staticScenes[sceneName];
			let scenesStack = game.__getScenesStack();
			if(!s.parent && scenesStack.indexOf(s) < 0 && scenesStack.indexOf(s.name as string) < 0) {
				Lib.destroyObjectAndChildren(s);
			}
		}
		staticScenes = {};
	}

	static __serializeObject(o: Container): SerializedObject {

		editorUtils.exitPreviewMode(o);
		if(o.__beforeSerialization) {
			o.__beforeSerialization();
		}

		let ret: SerializedObject | undefined;
		if(!game.editor.disableFieldsCache) {
			ret = o.__nodeExtendData.serializationCache;
		}
		if(!ret) {
			let props: KeyedObject = {};
			let propsList = (o.constructor as SourceMappedConstructor).__editableProps;

			let defaults: KeyedObject = getPrefabDefaults(o);

			for(let p of propsList) {
				if(!p.notSerializable) {
					let val = (o as KeyedObject)[p.name];
					if((val != defaults[p.name]) && (typeof val !== 'undefined') && (val !== null)) {
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

			if(o.__nodeExtendData.isPrefabReference) {
				ret = {
					r: o.__nodeExtendData.isPrefabReference,
					p: props
				};
				if(o.__nodeExtendData.unknownPrefab) {
					ret.r = o.__nodeExtendData.unknownPrefab;
					ret.p = o.__nodeExtendData.unknownPrefabProps!;
				}
			} else {
				ret = {
					c: (o.constructor as SourceMappedConstructor).__className as string,
					p: props
				};
				if(o.__nodeExtendData.unknownConstructor) {
					ret.c = o.__nodeExtendData.unknownConstructor;
					ret.p = Object.assign(o.__nodeExtendData.unknownConstructorProps as SerializedObjectProps, ret.p);
				}
			}

			if(o.children.length > 0) {
				let children = (o.children as Container[]).filter(__isSerializableObject).map(Lib.__serializeObject as () => SerializedObject);
				if(children.length > 0) {
					ret![':'] = children;
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
		assert(scenes.hasOwnProperty(_sceneName), "attempt to delete not existing scene: " + _sceneName);
		delete scenes[_sceneName];
		return fs.deleteAsset(_sceneName, AssetType.SCENE);
	}

	static __saveScene(scene: Scene, name: string) {

		assert(game.__EDITOR_mode, "attempt to save scene in running mode: " + name);
		assert(typeof name === 'string', "string expected");
		assert(scene instanceof Scene, "attempt to save not Scene instance in to scenes list.");

		game.editor.disableFieldsCache = true;
		let sceneData = Lib.__serializeObject(scene);
		game.editor.disableFieldsCache = false;
		if(!name.startsWith(game.editor.backupPrefix)) {
			scene.name = name;
		}
		scenes[name] = sceneData;
		return fs.saveAsset(name, AssetType.SCENE, sceneData);
	}

	static __savePrefab(object: Container, name: string) {
		invalidatePrefabDefaults();
		assert(game.__EDITOR_mode, "attempt to save prefab in running mode: " + name);
		assert(typeof name === 'string', "Prefab name expected.");
		assert(!(object instanceof Scene), "attempt to save Scene or not DisplayObject as prefab.");
		let tmpName = object.name;
		if(!name.startsWith(game.editor.backupPrefix)) {
			object.name = name;
		}
		game.editor.disableFieldsCache = true;
		let prefabData = Lib.__serializeObject(object);
		game.editor.disableFieldsCache = false;
		prefabs[name] = prefabData;
		fs.saveAsset(name, AssetType.PREFAB, prefabData);
		object.name = tmpName;
	}

	static __loadPrefabReference(prefabName: string) {
		let ret = Lib.loadPrefab(prefabName);
		__preparePrefabReference(ret, prefabName);
		return ret;
	}

	static __callInitIfGameRuns(node: Container) {
		if(!game.__EDITOR_mode) {
			__callInitIfNotCalled(node);
		}
	}

	static __texturesList: SelectEditorItem[] = [];

	static __deleteTexture(textureName: string) {
		if(textures[textureName]) {
			Object.assign(textures[textureName], Lib.REMOVED_TEXTURE);
		}

	}

	/// #endif

	/// #if DEBUG

	static get __soundsList() {
		return soundsHowlers;
	}

	/**
	 * @protected
	 */
	static __overrideSound(name: string, src: string[] | string) {
		let opt = { src };
		let s = loadSound(opt);
		s.lastPlayStartFrame = 0;
		soundsHowlers[name] = s;
		/** TODO
		if(game.classes.BgMusic) {
			for(let bgm of game.currentContainer.findChildrenByType(game.classes.BgMusic)) {
				if(bgm.isPlaying && (bgm.intro === name || bgm.loop === name)) {
					bgm.stop();
					bgm.resetPosition();
					setTimeout(() => {
						if((bgm.intro === name || bgm.loop === name)) {
							bgm.play();
						}
					}, 3000);
				}
			}
		}*/
	}

	/// #endif
}

const __isSerializableObject = (o: Container) => {
	let exData = o.__nodeExtendData;
	return !exData.hidden && !exData.noSerialize;
};

let deserializationDeepness = 0;

const _loadObjectFromData = (src: SerializedObject): Container => {

	/// #if EDITOR
	showedReplacings = {};
	/// #endif

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
		assert(false, "Class " + (o.constructor as SourceMappedConstructor).__className + " overrides init method without super.init() called.", 10042);
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

/// #if EDITOR
const EMPTY_NODE_EXTEND_DATA: NodeExtendData = { objectDeleted: "Container was deleted and it`s extend data replaced with temporary object." };
Object.freeze(EMPTY_NODE_EXTEND_DATA);

export { constructRecursive };
export { __onAssetAdded, __onAssetUpdated, __onAssetDeleted };

const __onAssetAdded = (file: FileDesc) => {
	console.log('added: ' + file.fileName);
	switch(file.assetType) {
		case AssetType.PREFAB:
			assert(!file.asset, 'asset reference of added file should be empty.');
			file.asset = Lib.prefabs[file.assetName] || fs.readJSONFile(file.fileName);
			game.editor.ui.refresh();
			break;
		case AssetType.CLASS:
			game.editor.classesUpdatedExternally();
			break;

		case AssetType.IMAGE:
			Lib.addTexture(file.assetName, file.fileName);
			game.editor.ui.refresh();
			break;



		//TODO images, sounds, scenes
	}
}

const __onAssetUpdated = (file: FileDesc) => {
	console.log('updated: ' + file.fileName);

	file.v = (file.v || 0) + 1;

	switch(file.assetType) {
		case AssetType.PREFAB:
			let isAcceptChanges = false;
			if(PrefabEditor.currentPrefabName !== file.assetName) {
				isAcceptChanges = true;
			} else {
				if(!game.editor.isCurrentContainerModified) {
					isAcceptChanges = true;
				} else {
					const answer = fs.showQuestion(
						'Do you want to load external changes?',
						'prefab "' + file.assetName + '" was changed externally.',
						'Keep editing',
						'Discard your changes and load external changes'/*,
						'Ignore external changes'*/);
					isAcceptChanges = answer === 1;
				}
			}
			if(isAcceptChanges) {
				file.asset = fs.readJSONFile(file.fileName);
				Lib.prefabs[file.assetName] = (file as FileDescPrefab).asset;
				__refreshPrefabRefs();
				if(PrefabEditor.currentPrefabName === file.assetName) {
					PrefabEditor.exitPrefabEdit();
					PrefabEditor.editPrefab(file.assetName);
				}
				game.editor.ui.refresh();
			}

			break;
		case AssetType.SCENE:
			//TODO
			break;
		case AssetType.CLASS:
			game.editor.classesUpdatedExternally();
			break;
		case AssetType.IMAGE:
			Lib.addTexture(file.assetName, file.fileName);
			game.editor.ui.refresh();
			break;
		//TODO images, sounds,
	}
}

const __onAssetDeleted = (file: FileDesc) => {
	console.log('deleted: ' + file.fileName);
	switch(file.assetType) {
		case AssetType.PREFAB:
			delete Lib.prefabs[file.assetName];
			game.editor.ui.refresh();
			break;
		case AssetType.SCENE:
			delete Lib.scenes[file.assetName];
			game.editor.ui.refresh();
			break;
		case AssetType.CLASS:
			game.editor.classesUpdatedExternally();
			break;
		case AssetType.IMAGE:
			Lib.__deleteTexture(file.assetName);
			game.editor.ui.refresh();
			break;


		//TODO images, sounds,
	}
}

let showedReplacings: KeyedMap<true>;


const __preparePrefabReference = (o: Container, prefabName: string) => {
	if(game.__EDITOR_mode) {
		o.__nodeExtendData.isPrefabReference = prefabName;
		for(const c of o.children) {
			c.__nodeExtendData.hidden = true;
		}
	}
}

function loadSound(opt: HowlSoundOptions, duration?: number): HowlSound {
	let s = new HowlSound(opt);

	s.once('loaderror', (er) => {
		//TODO s.loadedWithError = true;  сделать s.state('error')?
		assert(false, "Can't load sound file " + opt.src + '. Error: ' + er);
	});
	s.once('load', () => {
		//@ts-ignore
		assert(opt.src.indexOf(s._src) >= 0, 'Howler _src property was moved. Refactoring of HowlSound class is required.');
		if(duration) {
			s.hackDuration(duration);
		}
	});
	return s;
}

/// #endif

/// #if DEBUG
function __callInitIfNotCalled(node: Container) {
	assert(!game.__EDITOR_mode, "Attempt to init object in editor mode.");
	if(!node._thing_initialized) {
		constructRecursive(node);
	}
}

const processAfterDeserialization = (o: Container) => {
	if(o.__afterDeserialization) {
		o.__afterDeserialization();
	}
};
/// #endif