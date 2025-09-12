
import type { Container, Spritesheet } from 'pixi.js';
import { Assets, Cache, MIPMAP_MODES, Texture, WRAP_MODES } from 'pixi.js';
import type { FileDesc, FileDescImage, FileDescPrefab, FileDescSound } from 'thing-editor/src/editor/fs';
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import TLib from 'thing-editor/src/editor/prefabs-typing';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import EDITOR_FLAGS, { EDITOR_BACKUP_PREFIX } from 'thing-editor/src/editor/utils/flags';
import getPrefabDefaults, { invalidatePrefabDefaults } from 'thing-editor/src/editor/utils/get-prefab-defaults';
import { checkForOldReferences, markOldReferences } from 'thing-editor/src/editor/utils/old-references-detect';
import PrefabEditor from 'thing-editor/src/editor/utils/prefab-editor';
import __refreshPrefabRefs, { __refreshPrefabRefsPrepare } from 'thing-editor/src/editor/utils/refresh-prefabs';
import roundUpPoint from 'thing-editor/src/editor/utils/round-up-point';
import { getCurrentStack } from 'thing-editor/src/editor/utils/stack-utils';
import { __UnknownClass } from 'thing-editor/src/editor/utils/unknown-class';
import HowlSound from 'thing-editor/src/engine/HowlSound';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Scene, { __UnknownClassScene } from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';
import getValueByPath from 'thing-editor/src/engine/utils/get-value-by-path';
import L from 'thing-editor/src/engine/utils/l';
import Pool from 'thing-editor/src/engine/utils/pool';
import RemoveHolder from 'thing-editor/src/engine/utils/remove-holder';
/// #if EDITOR
// run EDITOR to regenerate this files:
import 'thing-editor/src/editor/current-classes-typings';
import 'thing-editor/src/editor/current-scene-typings';

import waitForCondition from './lib/assets/src/utils/wait-for-condition';
/// #endif
import type { AssetsDescriptor } from '../editor/editor-env';
import Sound from './utils/sound';

let classes: GameClasses;
let scenes: KeyedMap<SerializedObject> = {};
let prefabs: KeyedMap<SerializedObject> = {};
let staticScenes: KeyedMap<Scene> = {};
let textures: KeyedMap<Texture> = {};
let soundsHowlers: KeyedMap<HowlSound> = {};

const removeHoldersToCleanup: RemoveHolder[] = [];

export const unHashedFileToHashed: Map<string, string> = new Map();

//@ts-ignore
const _initParsers = () => {
	const spriteSheetLoader = Assets.loader.parsers.find(p => p.name === 'spritesheetLoader');
	const originalParser = spriteSheetLoader!.parse!;
	spriteSheetLoader!.parse = (asset: any, options, ...args) => {
		const n = options!.src!.lastIndexOf('/') + 1;
		let url = options!.src!.substring(0, n) + asset.meta.image;
		asset.meta.image = unHashedFileToHashed.get(url)!.split('/').pop();
		return originalParser(asset, options, ...args);
	};

	const loadBitmapFont = Assets.loader.parsers.find(p => p.name === 'loadBitmapFont');
	const originalBMFParser = loadBitmapFont!.parse!;
	loadBitmapFont!.parse = (asset: string, options, ...args) => {
		const reg = /(file=")([^"]+)(")/gm;
		let result:RegExpExecArray |null;
		let fixedAsset:string = asset;
		while ((result = reg.exec(asset)) !== null) {
			const a = options!.src!.split('/');
			a.pop();
			const textureName = result![2];
			const fileName = a.join('/') + '/' + textureName;
			fixedAsset = fixedAsset.replace(textureName, unHashedFileToHashed.get(fileName)!.split('/').pop()!);
		}
		return originalBMFParser(fixedAsset, options, ...args);
	};
};

/// #if EDITOR
/*
/// #endif
_initParsers();
//*/

export default class Lib
	/// #if EDITOR
	extends TLib
/// #endif
{

	static ASSETS_ROOT = './assets/';

	static sounds: KeyedMap<HowlSound>;

	static resources: KeyedObject = {};

	static fonts: KeyedObject = {};

	static REMOVED_TEXTURE: Texture;

	/// #if EDITOR
	static __loadSceneNoInit(name: string): Scene {
		return (this.loadScene as any)(name, true);
	}

	/// #endif

	static loadScene(name: string): Scene {

		/// #if EDITOR
		const omitInitialization = arguments[1] || game.__EDITOR_mode;
		/// #endif

		if (
			/// #if EDITOR
			!omitInitialization &&
			/// #endif
			staticScenes.hasOwnProperty(name)) {
			return staticScenes[name];
		}
		let isSceneExists = scenes.hasOwnProperty(name);
		assert(isSceneExists, 'No scene with name \'' + name + '\'', 10046);
		/// #if EDITOR

		let overrideName = name;
		if (!omitInitialization && (name === game.editor.currentSceneName)) {
			if (scenes[game.editor.currentSceneBackupName]) {
				overrideName = game.editor.currentSceneBackupName;
			}
		}

		if (!name.startsWith(EDITOR_BACKUP_PREFIX)) {
			scenes[name].p.name = name;
		}
		/// #endif

		/// #if EDITOR
		showedReplaces = {};
		/// #endif

		const s: Scene = Lib._deserializeObject(scenes[
			/// #if EDITOR
			overrideName ||
			/// #endif
			name]) as Scene;

		/// #if EDITOR
		if (!omitInitialization) {
			/// #endif
			constructRecursive(s);
			/// #if EDITOR
		}
		/// #endif

		if (s.isStatic
			/// #if EDITOR
			&& !omitInitialization
			/// #endif
		) {
			staticScenes[name] = s;
		}
		return s;
	}

	static _setClasses(_classes: GameClasses) {
		game._setClasses(_classes);
		classes = _classes;
		/// #if EDITOR
		return;
		/// #endif
		normalizeSerializedData();
		/// #if DEBUG
		__checkClassesForEditorOnlyMethods(_classes);
		/// #endif
	}

	static scenes: KeyedMap<SerializedObject>;
	static prefabs: KeyedMap<SerializedObject>;

	/// #if EDITOR
	static __outdatedReferencesDetectionDisabled = 0;
	/// #endif

	static hasPrefab(name: string) {
		return prefabs.hasOwnProperty(name);
	}

	static hasScene(name: string) {
		return scenes.hasOwnProperty(name);
	}

	static hasTexture(name: string) {
		return textures.hasOwnProperty(name);
	}

	static _unloadTexture(name: string) {
		let texture = textures[name];
		if (!texture) {
			return;
		}
		Texture.removeFromCache(texture);
		texture.destroy(true);
	}

	/// #if EDITOR
	static removeAtlas(file: FileDesc) {
		Cache.remove(file.fileName);
		for (const textureName in (file.asset as KeyedObject).frames) {
			fs.removeSubAsset(textureName, AssetType.IMAGE);
			Lib.__deleteTexture(textureName);
		}
	}
	/// #endif

	static __parsersLoadingPromises = [] as Promise<true>[];

	static async addResource(name: string, url: string, attempt = 0
		/// #if EDITOR
		, parentAsset?: FileDesc
		/// #endif
	) {
		game.loadingAdd(url);

		await Promise.all(Lib.__parsersLoadingPromises);

		Assets.load(
			/// #if EDITOR
			getVersionedFileName(parentAsset!) ||
			/// #endif
			url).then((atlas: Spritesheet) => {
			if (atlas.textures) {
				for (const textureName in atlas.textures) {
					const texture = atlas.textures[textureName];
					textures[textureName] = texture;

					/// #if EDITOR
					const existingAsset = fs.getFileByAssetName(textureName, AssetType.IMAGE);
					if (existingAsset) {
						existingAsset.asset = texture;
						existingAsset.parentAsset = parentAsset;
					} else {
						const cloneAsset = Object.assign({}, parentAsset);
						cloneAsset.asset = texture;
						cloneAsset.assetName = textureName;
						cloneAsset.parentAsset = parentAsset;
						cloneAsset.assetType = AssetType.IMAGE;
						fs.addSubAsset(cloneAsset);
					}
				/// #endif
				}
			}
			Lib.resources[name] = atlas;
			game.loadingRemove(url);
			/// #if EDITOR
			game.editor.ui.refresh();
			/// #endif
		}).catch((_er) => {
			/// #if EDITOR
			debugger;
			attempt = 3;
			/// #endif
			if (attempt < 3 && !game._loadingErrorIsDisplayed) {
				attempt++;
				window.setTimeout(() => {
					Lib.addResource(name, url + ((attempt === 1) ? '?a' : 'a'), attempt
						/// #if EDITOR
						, parentAsset
						/// #endif
					);
					game.loadingRemove(url);
				}, attempt * 1000);
			} else {
				game.showLoadingError(url
					/// #if DEBUG
					+ '; ' + _er.stack
					/// #endif
				);
			}
		});
	}

	static addTexture(name: string, textureURL: string | Texture, attempt = 0) {
		/// #if EDITOR
		if (game.editor.buildProjectAndExit) {
			if (typeof textureURL === 'string') {
				textureURL = Texture.WHITE;
			}
		}
		/// #endif

		if (typeof textureURL === 'string') {

			game.loadingAdd(textureURL);

			/// #if EDITOR
			const asset = fs.getFileByAssetName(name, AssetType.IMAGE) as FileDescImage;
			/// #endif
			Texture.fromURL(
				/// #if EDITOR
				getVersionedFileName(asset) ||
				/// #endif
				textureURL).then((newTexture) => {
				/// #if EDITOR
				if (textures[name]) {
					if (textures[name] && !Lib.__isSystemTexture(textures[name], name)) {
						Lib._unloadTexture(name);
					}
					const oldTexture = textures[name];
					Object.assign(oldTexture, newTexture);
					oldTexture.onBaseTextureUpdated(newTexture.baseTexture);
					oldTexture._updateID = Date.now();
				} else {
					/// #endif
					textures[name] = newTexture;
					/// #if EDITOR
				}
				/// #endif
				Lib._afterTextureLoaded(name);
				game.loadingRemove(textureURL);
			}).catch(() => {
				if (attempt < 3 && !game._loadingErrorIsDisplayed) {
					attempt++;
					window.setTimeout(() => {
						Lib.addTexture(name, textureURL + ((attempt === 1) ? '?a' : 'a'), attempt);
						game.loadingRemove(textureURL);
					}, attempt * 1000);
				} else {
					game.showLoadingError(textureURL as string);
				}
			});
		} else {
			textures[name] = textureURL;
			Lib._afterTextureLoaded(name);
		}
	}

	/* texture settings bits
	1 - load on demand
	2 - load on demand with early preCache
	4 - generate mip-maps
	8 - wrap mode repeat
	16 - wrap mode repeat mirror
	*/
	static _getTextureSettingsBits(name: string, mask: number) {
		let s = game.projectDesc.loadOnDemandTextures;
		return s.hasOwnProperty(name) ? (s[name] & mask) : 0;
	}

	static _afterTextureLoaded(name: string) {
		let baseTexture = textures[name].baseTexture;
		switch (Lib._getTextureSettingsBits(name, 24)) {
		case 0:
			baseTexture.wrapMode = WRAP_MODES.CLAMP;
			break;
		case 8:
			baseTexture.wrapMode = WRAP_MODES.REPEAT;
			break;
		default:
			baseTexture.wrapMode = WRAP_MODES.MIRRORED_REPEAT;
			break;
		}

		if (Lib._getTextureSettingsBits(name, 4)) {
			baseTexture.mipmap = MIPMAP_MODES.ON;
		}

		baseTexture.update();

		/// #if EDITOR
		editorEvents.emit('textureUpdated', name);
		/// #endif
	}

	/// #if EDITOR
	static __isSystemTexture(texture: Texture, imageName:string) {
		if (game.editor.buildProjectAndExit) {
			return imageName === 'EMPTY' || imageName === 'WHITE';
		}
		return texture.baseTexture === Lib.REMOVED_TEXTURE.baseTexture ||
			texture.baseTexture === textures.EMPTY.baseTexture ||
			texture.baseTexture === textures.WHITE.baseTexture;
	}
	/// #endif

	static getTexture(name: string) {

		/// #if EDITOR
		if (!textures.hasOwnProperty(name)) {
			textures[name] = Lib.REMOVED_TEXTURE.clone();
		}
		/// #endif
		/// #if DEBUG
		assert(textures.hasOwnProperty(name), 'wrong image name ' + name);
		/// #endif

		return textures[name];
	}

	static _getStaticScenes() {
		return staticScenes;
	}

	static hasSound(soundId: string) {
		return soundsHowlers.hasOwnProperty(soundId);
	}

	static getSound(soundId: string, __dynamicPreloading = false): HowlSound {
		assert(soundsHowlers.hasOwnProperty(soundId), 'No sound with id \'' + soundId + '\' found.');
		let s = soundsHowlers[soundId];
		/// #if EDITOR
		if (!game.__EDITOR_mode) {
			if (s.state() === 'unloaded') {
				game.editor.ui.status.error('Sound "' + soundId + '" is not preloaded. Please check-on preloading mode for this sound, or use Lib.preloadSound("' + soundId + '") in scene\`s onShow() method before using this sound.', 32008);
			} else if (!__dynamicPreloading && (s.state() === 'loading')) {
				game.editor.ui.status.warn('Sound "' + soundId + '" preloading is not finished. Please preload sounds inside onShow method of scene, to automatic insurance of complete sounds preloading.', 32009);
			}
			Lib.preloadSound(soundId);
		}
		/// #endif
		return s;
	}

	/// #if EDITOR
	static async __addSoundEditor(file: FileDescSound) {
		await waitForCondition(() => !fs.soundsRebuildInProgress());
		const fileName = getVersionedFileName(file)!.replace(/wav(\?|$)/, 'ogg?');
		soundsHowlers[file.assetName] = new HowlSound({ src: fileName });
		file.asset = Lib.getSound(file.assetName);
		const soundsDirData = fs.soundsData.get(file.lib ? file.lib.dir : game.editor.currentProjectAssetsDir)!;
		if (soundsDirData) {
			const sndData = soundsDirData.soundInfo[file.fileName.substring(1)];
			if (sndData) {
				file.asset.preciseDuration = sndData.duration;
			}
		}

		game.editor.ui.refresh();
	}
	/// #endif

	static addSound(name: string, url: string, duration: number) {
		/// #if EDITOR
		assert(false, 'for editor mode use Lib.__addSoundEditor instead.');
		/// #endif
		const s = new HowlSound({ src: game.projectDesc.soundFormats.map(ext => url + '.' + ext) });
		s.preciseDuration = duration;
		soundsHowlers[name] = s;
		/// #if DEBUG
		Sound.__refreshDebugger();
		/// #endif
	}

	static preloadSound(soundId: string | null
		/// #if EDITOR
		, owner?: any// BgMusic
		/// #endif
	) {
		if (soundId) {
			/// #if EDITOR
			if (!soundsHowlers.hasOwnProperty(soundId)) {
				game.editor.ui.status.error('No sound with id \'' + soundId + '\' found.', 10043, owner);
				return;
			}
			/// #endif
			let s = soundsHowlers[soundId];
			if (s.state() === 'unloaded') {
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

		/// #if EDITOR
		let ret: Container;


		deserializationDeepness++;

		if (src.hasOwnProperty('r')) { // prefab reference
			deserializationReferencesDeepness++;
			let replacedPrefabName: string | undefined;
			if (!Lib.hasPrefab(src.r!)) {
				replacedPrefabName = '___system/unknown-prefab';
				if (!showedReplaces[src.r!]) {
					showedReplaces[src.r!] = true;
					window.setTimeout(() => { // wait for id assign
						game.editor.ui.status.error('Reference to unknown prefab: \'' + src.r + '\'', 99999, ret);
					}, 1);
				}
			}
			const refName = replacedPrefabName || src.r!;
			prefabs[refName].__lastTouch = EDITOR_FLAGS.__touchTime;
			ret = Lib._deserializeObject(prefabs[refName]);
			ret.__nodeExtendData.__deserializedFromPrefab = refName;
			Object.assign(ret, src.p);

			if (replacedPrefabName) {
				ret.__nodeExtendData.unknownPrefab = src.r;
				ret.__nodeExtendData.unknownPrefabProps = src.p;
			}
			__preparePrefabReference(ret, src.r!);
			deserializationReferencesDeepness--;
		} else { // not a prefab reference


			let replaceClass: SourceMappedConstructor | undefined = undefined;
			let replaceClassName: string | undefined;

			if (!classes.hasOwnProperty(src.c!)) {
				replaceClass = (((Object.values(scenes).indexOf(src) >= 0) || isScene) ? __UnknownClassScene : __UnknownClass);
				replaceClassName = replaceClass.__className;
				if (!showedReplaces[src.c!]) {
					showedReplaces[src.c!] = true;
					if (game.editor.buildProjectAndExit) {
						game.editor.ui.status.error('Unknown class ' + src.c, 32012);
					} else {
						window.setTimeout(() => { // wait for id assign
							game.editor.ui.status.error('Unknown class ' + src.c, 32012, ret);
						}, 1);
					}
				}
			}
			if (!replaceClass) {
				assert(classes[src.c!].__defaultValues, 'Class ' + (replaceClassName || src.c) + ' has no default values set');
			}

			const constrictor = (replaceClass || classes[src.c!]);

			ret = Pool.create(constrictor as any);

			if (ret.__beforeDeserialization) {
				ret.__beforeDeserialization();
			}
			if (replaceClassName) {
				ret.__nodeExtendData.unknownConstructor = src.c;
				ret.__nodeExtendData.unknownConstructorProps = src.p;
			}

			Object.assign(ret, Object.assign({}, constrictor.__defaultValues, src.p));
		}

		/*
		/// #endif
		// production deserialization
		const ret = Pool.create(src.c as any as Constructor);
		Object.assign(ret, src.p);
		//*/

		if (src.hasOwnProperty(':')) {
			let childrenData: SerializedObject[] = src[':'] as SerializedObject[];

			/// #if EDITOR
			if (!game.__EDITOR_mode || deserializationReferencesDeepness) {
				childrenData = childrenData.filter(_filterStaticTriggers);
			}
			/// #endif
			for (let childData of childrenData) {
				/// #if EDITOR

				let isVisible = game.__EDITOR_mode || !childData.p.hasOwnProperty('name') || !childData.p.name || !childData.p.name.startsWith('___');
				if (isVisible) {
					isVisible = !childData.p.hasOwnProperty('name') || !childData.p.name || !childData.p.name.startsWith('____'); //99999
				}
				if (isVisible) {
					/// #endif
					ret.addChild(Lib._deserializeObject(childData));
					/// #if EDITOR
				}
				/// #endif
			}
		}

		/// #if EDITOR
		deserializationDeepness--;
		if (deserializationDeepness === 0) {
			src.__lastTouch = EDITOR_FLAGS.__touchTime;
			processAfterDeserialization(ret);
			ret.forAllChildren(processAfterDeserialization);
		}
		/// #endif

		return ret;
	}

	static getHashedFileName(assetName:string
		/// #if EDITOR
		, assetType = AssetType.IMAGE
		/// #endif
	) {
		/// #if EDITOR
		return fs.getFileByAssetName(assetName, assetType)?.fileName;
		/*
		/// #endif
		return Lib.ASSETS_ROOT + unHashedFileToHashed.get(Lib.ASSETS_ROOT + assetName);
		//*/
	}

	static addAssets(data: AssetsDescriptor, assetsRoot = Lib.ASSETS_ROOT) {

		for (const prefabName in data.prefabs) {
			if (!prefabs[prefabName]) {
				prefabs[prefabName] = data.prefabs[prefabName];
			}
		}

		for (const prefabName in data.scenes) {
			if (!scenes[prefabName]) {
				scenes[prefabName] = data.scenes[prefabName];
			}
		}

		if (game.classes) {
			normalizeSerializedData();
		}

		if (data.text) {
			L.setLanguagesAssets(data.text);
		}

		for (const textureName of data.images) {
			Lib.addTexture(Lib.unHashFileName(textureName, assetsRoot), assetsRoot + textureName);
		}

		for (const soundEntry of data.sounds) {
			Lib.addSound(Lib.unHashFileName(soundEntry[0], assetsRoot), assetsRoot + soundEntry[0], soundEntry[1]);
		}
		if (data.resources) {
			for (const name of data.resources) {
				Lib.addResource(Lib.unHashFileName(name, assetsRoot), assetsRoot + name + '.json');
			}
		}
		if (data.xmls) {
			for (const xmlName of data.xmls) {
				Assets.load(assetsRoot + xmlName + '.xml');
			}
		}
		if (data.fonts) {
			for (const fontName of data.fonts) {
				Lib.fonts[Lib.unHashFileName(fontName, assetsRoot)] = assetsRoot + fontName;
			}
		}
	}

	static unHashFileName (fileName: string, assetsRoot: string = Lib.ASSETS_ROOT): string {
		const n = fileName.lastIndexOf('.');
		if (n > 0) {
			const ret = fileName.substring(0, n - 9) + fileName.substring(n);
			unHashedFileToHashed.set(assetsRoot + ret, fileName);
			return ret;
		}
		return fileName.slice(0, -9);
	}

	static destroyObjectAndChildren(o: Container, itsRootRemoving?: boolean) {
		/// #if EDITOR

		if (EDITOR_FLAGS._root_initCalled.has(o)) {
			assert(false, 'Attempt to self remove inside init() method. Operation does not supported. Do not instance object if you going to just remove. Or remove it in parent.init() method before its init() method called.', 90000);
		}

		let extData = o.__nodeExtendData;
		editorUtils.exitPreviewMode(o);
		if (extData.constructorCalled) {

			EDITOR_FLAGS._root_onRemovedCalled.add(o);
			/// #endif

			o.onRemove();
			o._thing_initialized = false;
			/// #if EDITOR
			if (EDITOR_FLAGS._root_onRemovedCalled.has(o)) {
				game.editor.editClassSource(o);
				assert(false, 'onRemove method without super.onRemove() detected in class \'' + (o.constructor as SourceMappedConstructor).name + '\'', 10045);
				EDITOR_FLAGS._root_onRemovedCalled.delete(o);
			}

		}
		if (o.__beforeDestroy) {
			o.__beforeDestroy();
		}
		let needRefreshSelection = extData.isSelected;
		if (extData.isSelected) {
			game.editor.selection.remove(o);
		}
		/// #endif
		if (itsRootRemoving
			/// #if EDITOR
			&& !game.__EDITOR_mode
			/// #endif
		) {
			let r = Pool.create(RemoveHolder);
			/// #if EDITOR
			r.stack = getCurrentStack('removing with holder at ' + game.time + '; ' + o.name);
			constructRecursive(r);
			/// #endif
			let c = o.parent.children;
			c[c.indexOf(o)] = r;
			r.parent = o.parent;

			removeHoldersToCleanup.push(r);

			o.parent = null as any;
		} else {
			o.detachFromParent();
		}
		while (o.children.length > 0) {
			Lib.destroyObjectAndChildren(o.getChildAt(o.children.length - 1) as Container);
		}

		Pool.dispose(o);

		o.interactiveChildren = true;

		/// #if EDITOR
		o.__nodeExtendData = EMPTY_NODE_EXTEND_DATA;
		if (needRefreshSelection) {
			game.editor.refreshTreeViewAndPropertyEditor();
		}
		markOldReferences(o);
		/// #endif
	}

	static _cleanupRemoveHolders() {
		while (removeHoldersToCleanup.length > 0) {
			Lib.destroyObjectAndChildren(removeHoldersToCleanup[0]);
		}
	}

	static _loadClassInstanceById(id: string): Container {
		const Class = classes[id];
		/// #if DEBUG
		if (!Class) {
			assert(false, 'No class with id "' + id + '" found.', 99999);
		}
		/// #endif
		let ret = Pool.create(Class as any) as Container;
		Object.assign(ret, Class.__defaultValues);

		/// #if EDITOR
		if (ret instanceof Scene) {

			ret.all = '"scene.all" is not initialized yet.' as any;
		}
		if (!game.__EDITOR_mode) {
			/// #endif
			constructRecursive(ret);
			/// #if EDITOR
		}
		/// #endif
		return ret;
	}

	static _clearStaticScene(sceneName: string) {
		let s = staticScenes[sceneName];
		if (s) {
			let scenesStack = game._getScenesStack();
			if (!s.parent && scenesStack.indexOf(s) < 0 && scenesStack.indexOf(s.name as string) < 0) {
				Lib.destroyObjectAndChildren(s);
			}
			delete staticScenes[sceneName];
		}
	}

	/// #if EDITOR

	static __clearStaticScenes() {
		const scenes = Object.assign({}, staticScenes);
		for (let sceneName in scenes) {
			this._clearStaticScene(sceneName);
		}
	}

	static __serializeObject(o: Container): SerializedObject {

		editorUtils.exitPreviewMode(o);
		roundUpPoint(o);
		if (o.__beforeSerialization) {
			o.__beforeSerialization();
		}

		let ret: SerializedObject | undefined;
		if (!game.editor.disableFieldsCache) {
			ret = o.__nodeExtendData.serializationCache;
		}
		if (!ret) {
			let props: KeyedObject = {};
			let propsList = (o.constructor as SourceMappedConstructor).__editableProps;

			let defaults: KeyedObject = getPrefabDefaults(o);

			for (let p of propsList) {
				if (!p.notSerializable) {
					if (p.visible && !p.visible(o)) {
						continue;
					}
					let val = (o as KeyedObject)[p.name];
					if (p.arrayProperty) {
						if (!val) {
							val = [];
						} else if (!Array.isArray(val)) {
							val = [val];
						}
						val = val.filter((i: any) => i);
						if ((val.length === defaults[p.name].length &&
							defaults[p.name].every((v: any, i: number) => v === val[i])
						)) {
							val = defaults[p.name];
						}
					}
					if ((val != defaults[p.name]) && (typeof val !== 'undefined')) {
						if (p.type === 'rect') {
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

			if (o.__nodeExtendData.isPrefabReference) {
				ret = {
					r: o.__nodeExtendData.isPrefabReference,
					p: props
				};
				if (o.__nodeExtendData.unknownPrefab) {
					ret.r = o.__nodeExtendData.unknownPrefab;
					ret.p = o.__nodeExtendData.unknownPrefabProps!;
				}
			} else {
				ret = {
					c: (o.constructor as SourceMappedConstructor).__className as string,
					p: props
				};
				if (o.__nodeExtendData.unknownConstructor) {
					ret.c = o.__nodeExtendData.unknownConstructor;
					ret.p = Object.assign(o.__nodeExtendData.unknownConstructorProps as SerializedObjectProps, ret.p);
				}
			}

			if (o.children.length > 0) {
				let children = (o.children as Container[]).filter(__isSerializableObject).map(Lib.__serializeObject as () => SerializedObject);
				if (children.length > 0) {
					ret![':'] = children;
				}
			}
			o.__nodeExtendData.serializationCache = ret;
		}

		if (o.__afterSerialization) {
			o.__afterSerialization(ret);
		}

		return ret;
	}

	static __invalidateSerializationCache(o: Container) {
		let p = o;
		while ((p !== game.stage) && p) {
			p.__nodeExtendData.serializationCache = undefined;
			p = p.parent;
		}
	}

	static __deleteScene(_sceneName: string) {
		assert(scenes.hasOwnProperty(_sceneName), 'attempt to delete not existing scene: ' + _sceneName);
		delete scenes[_sceneName];
		return fs.deleteAsset(_sceneName, AssetType.SCENE);
	}

	static __saveScene(scene: Scene, name: string) {

		assert(game.__EDITOR_mode, 'attempt to save scene in running mode: ' + name);
		assert(typeof name === 'string', 'string expected');
		assert(scene instanceof Scene, 'attempt to save not Scene instance in to scenes list.');

		game.editor.disableFieldsCache = true;
		if (!name.startsWith(EDITOR_BACKUP_PREFIX)) {
			if (scene.name !== name) {
				game.editor.ui.sceneTree.refresh();
			}
			scene.name = name;
		}
		let sceneData = Lib.__serializeObject(scene);
		game.editor.disableFieldsCache = false;
		scenes[name] = sceneData;
		const ret = fs.saveAsset(name, AssetType.SCENE, sceneData);
		editorEvents.emit('sceneUpdate', name);
		return ret;
	}

	static __savePrefab(object: Container, name: string, libName?: string, saveFile = true) {
		invalidatePrefabDefaults();
		assert(game.__EDITOR_mode, 'attempt to save prefab in running mode: ' + name);
		assert(typeof name === 'string', 'Prefab name expected.');
		assert(!(object instanceof Scene), 'attempt to save Scene or not DisplayObject as prefab.');
		let tmpName = object.name;
		if (!name.startsWith(EDITOR_BACKUP_PREFIX)) {
			if (object.name !== name) {
				game.editor.ui.sceneTree.refresh();
			}
			object.name = name;
		}
		game.editor.disableFieldsCache = true;
		let prefabData = Lib.__serializeObject(object);
		prefabData.p.___prefabPivot = PrefabEditor.pivot;
		game.editor.disableFieldsCache = false;
		this.__savePrefabData(prefabData, name, libName, saveFile);
		object.name = tmpName;
	}

	static __savePrefabData(prefabData: SerializedObject, name: string, libName?: string, saveFile = true) {
		prefabs[name] = prefabData;
		if (saveFile) {
			fs.saveAsset(name, AssetType.PREFAB, prefabData, libName);
		}
		editorEvents.emit('prefabUpdated', name);
	}

	static __loadPrefabNoInit(prefabName: string) {
		return (Lib.loadPrefab as any)(prefabName, true);
	}

	static __preparePrefabReference(o: Container, prefabName: string) {
		__preparePrefabReference(o, prefabName);
	}

	static __loadPrefabReference(prefabName: string) {
		let ret = Lib.loadPrefab(prefabName);
		__preparePrefabReference(ret, prefabName);
		return ret;
	}

	static __callInitIfGameRuns(node: Container) {
		if (!game.__EDITOR_mode) {
			__callInitIfNotCalled(node);
		}
	}

	static __deleteSound(file: FileDescSound) {
		file.asset.unload();
		delete soundsHowlers[file.assetName];
	}

	static __deleteTexture(textureName: string) {
		if (textures[textureName]) {
			const texture = textures[textureName];
			let tmp = texture._updateID;
			Texture.removeFromCache(texture);
			Object.assign(texture, Lib.REMOVED_TEXTURE);
			texture._updateID = tmp;
			texture.onBaseTextureUpdated(texture.baseTexture);
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
	static __overrideSound(soundId: string, src: string[] | string | HowlSound) {
		let s:HowlSound;
		if (src instanceof HowlSound) {
			s = src;
		} else {
			let opt = { src };
			s = new HowlSound(opt);
		}
		s.lastPlayStartFrame = 0;
		soundsHowlers[soundId] = s;
		game.emit('__sound-overridden', soundId);
	}

	/// #endif
}

const __isSerializableObject = (o: Container) => {
	let exData = o.__nodeExtendData;
	return !exData.hidden && !exData.noSerialize;
};

let deserializationDeepness = 0;
let deserializationReferencesDeepness = 0;

let constructRecursive = (o: Container) => {
	assert(!game.__EDITOR_mode, 'initialization attempt in editing mode.');

	if (o._thing_initialized) {
		return;
	}
	o._thing_initialized = true;

	/// #if EDITOR
	let extData = o.__nodeExtendData;
	assert(!extData.constructorCalled, 'init() method was already called for object ' + o.___info, 90001);

	EDITOR_FLAGS._root_initCalled.add(o);
	/// #endif

	o.init();

	/// #if EDITOR
	checkForOldReferences(o);
	if (EDITOR_FLAGS._root_initCalled.has(o)) {
		game.editor.editClassSource(o);
		assert(false, 'Class ' + (o.constructor as SourceMappedConstructor).__className + ' overrides init method without super.init() called.', 10042);
		EDITOR_FLAGS._root_initCalled.delete(o);
	}
	extData.constructorCalled = true;
	/// #endif

	let a: Container[] = o.children as Container[];
	let arrayLength = a.length;
	for (let i = 0; i < arrayLength; i++) {
		constructRecursive(a[i]);
	}
};

Lib.scenes = scenes;
Lib.prefabs = prefabs;

const normalizeSerializedDataRecursive = (data: SerializedObject) => {
	if (data.c) {
		if (typeof data.c === 'string') {

			assert(game.classes[data.c], 'Unknown class ' + data.c);

			data.c = game.classes[data.c] as any; // in runtime mode ".c" contains Class directly
			data.p = Object.assign({}, (data.c as any as SourceMappedConstructor).__defaultValues, data.p);
			if (data[':']) {
				for (const c of data[':']) {
					normalizeSerializedDataRecursive(c);
				}
			}
		}
	} else {
		const prefab = prefabs[data.r!];
		normalizeSerializedDataRecursive(prefab);

		delete data.r;
		data.c = prefab.c;
		data.p = Object.assign({}, prefab.p, data.p);

		if (prefab[':']) {
			if (data[':']) {
				data[':'] = prefab[':'].concat(data[':']);
			} else {
				data[':'] = prefab[':'];
			}
		}

		if (data[':']) {
			for (const c of data[':']) {
				normalizeSerializedDataRecursive(c);
			}
		}
	}
	if (data.p.timeline) {
		for (const f of data.p.timeline.f) {
			data.p[f.n] = f.t[0].v;
		}
	}
};

const normalizeSerializedData = () => {
	/// #if EDITOR
	assert(false, 'runtime feature only.');
	/// #endif

	Object.values(prefabs).forEach(_filterStaticTriggersRecursive);
	Object.values(scenes).forEach(_filterStaticTriggersRecursive);

	for (const name in prefabs) {
		normalizeSerializedDataRecursive(prefabs[name]);
	}
	for (const name in scenes) {
		normalizeSerializedDataRecursive(scenes[name]);
	}
};

/// #if EDITOR

const getVersionedFileName = (file: FileDesc) => {
	if (file) {
		if (file.v) {
			return file.fileName + '?v=' + file.v;
		}
		return file.fileName;
	}
};

export const EMPTY_NODE_EXTEND_DATA: NodeExtendData = { objectDeleted: 'Container was deleted and it`s extend data replaced with temporary object.' };
Object.freeze(EMPTY_NODE_EXTEND_DATA);

export { __onAssetAdded, __onAssetDeleted, __onAssetUpdated, constructRecursive };

const isAtlasAsset = (asset: any) => {
	return asset?.meta?.scale || asset?.skeleton;
};

const __onAssetAdded = (file: FileDesc) => {
	switch (file.assetType) {
	case AssetType.PREFAB:
		assert(!file.asset, 'asset reference of added file should be empty.');
		file.asset = Lib.prefabs[file.assetName] = fs.readJSONFile(file.fileName);
		game.editor.ui.refresh();
		break;
	case AssetType.SCENE:
		assert(!file.asset, 'asset reference of added file should be empty.');
		file.asset = Lib.scenes[file.assetName] = fs.readJSONFile(file.fileName);
		game.editor.ui.refresh();
		break;
	case AssetType.IMAGE:
		Lib.addTexture(file.assetName, (file as FileDescImage).asset || file.fileName);
		file.asset = Lib.getTexture(file.assetName);
		game.editor.ui.refresh();
		break;

	case AssetType.SOUND:
		Lib.__addSoundEditor(file as FileDescSound);
		break;
	case AssetType.RESOURCE:
		file.asset = fs.readJSONFile(file.fileName) as KeyedObject;
		if (isAtlasAsset(file.asset)) {
			Lib.addResource(file.assetName, file.fileName, 0, file);
		}
		break;
	case AssetType.BITMAP_FONT:
		Assets.load(file.fileName);
		break;
	case AssetType.L10N:
		file.asset = L._deserializeLanguage(fs.readJSONFile(file.fileName) as KeyedObject);
		game.editor.LanguageView.addAssets();
		break;
	}
};

const __onAssetUpdated = (file: FileDesc) => {
	let isAcceptChanges;
	switch (file.assetType) {
	case AssetType.PREFAB:
		isAcceptChanges = false;
		if (PrefabEditor.currentPrefabName !== file.assetName) {
			isAcceptChanges = true;
		} else {
			if (!game.editor.isCurrentContainerModified) {
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
		if (isAcceptChanges) {
			__refreshPrefabRefsPrepare();
			file.asset = fs.readJSONFile(file.fileName);
			Lib.prefabs[file.assetName] = (file as FileDescPrefab).asset;
			__refreshPrefabRefs();
			if (PrefabEditor.currentPrefabName === file.assetName) {
				PrefabEditor.exitPrefabEdit();
				PrefabEditor.editPrefab(file.assetName);
			}
			game.editor.ui.refresh();
		}

		break;
	case AssetType.SCENE:
		//TODO
		break;
	case AssetType.IMAGE:
		Lib.addTexture(file.assetName, file.fileName);
		game.editor.ui.refresh();
		break;
	case AssetType.SOUND:
		Lib.__addSoundEditor(file as FileDescSound);
		break;
	case AssetType.RESOURCE:
		if (isAtlasAsset(file.asset)) {
			Lib.removeAtlas(file);
			file.asset = fs.readJSONFile(file.fileName) as KeyedObject;
			Lib.addResource(file.assetName, file.fileName, 0, file);
		}
		break;
	case AssetType.BITMAP_FONT:
		Assets.load(file.fileName + '?v=' + file.v);
		break;
	case AssetType.L10N:
		file.asset = L._deserializeLanguage(fs.readJSONFile(file.fileName) as KeyedObject);
		game.editor.LanguageView.addAssets();
		break;
	}
};

const __onAssetDeleted = (file: FileDesc) => {
	console.log('deleted: ' + file.fileName);
	switch (file.assetType) {
	case AssetType.PREFAB:
		delete Lib.prefabs[file.assetName];
		game.editor.ui.refresh();
		break;
	case AssetType.SCENE:
		delete Lib.scenes[file.assetName];
		game.editor.ui.refresh();
		break;
	case AssetType.IMAGE:
		Lib.__deleteTexture(file.assetName);
		game.editor.ui.refresh();
		break;
	case AssetType.RESOURCE:
		if (isAtlasAsset(file.asset)) {
			Lib.removeAtlas(file);
			game.editor.ui.refresh();
		}
		break;
	case AssetType.L10N:
		game.editor.LanguageView.removeAsset();
		break;
	case AssetType.SOUND:
		Lib.__deleteSound(file as FileDescSound);
		break;
	}
};

let showedReplaces: KeyedMap<true>;


const __preparePrefabReference = (o: Container, prefabName: string) => {
	if (game.__EDITOR_mode) {
		o.__nodeExtendData.isPrefabReference = prefabName;
		for (const c of o.children) {
			c.__nodeExtendData.hidden = true;
		}
	}
};
/// #endif

/// #if DEBUG
function __callInitIfNotCalled(node: Container) {
	assert(!game.__EDITOR_mode, 'Attempt to init object in editor mode.');
	if (!node._thing_initialized) {
		constructRecursive(node);
	}
}

const processAfterDeserialization = (o: Container) => {
	if (o.__afterDeserialization) {
		o.__afterDeserialization();
	}
};

const EDITOR_ONLY_METHODS = [
	'__beforeDeserialization',
	'__treeInjection',
	'__beforeSerialization',
	'__afterDeserialization',
	'__afterSerialization',
	'__beforeDestroy',
	'__EDITOR_onCreate',
	'__EDITOR_filterPropsSelection',
	'__goToPreviewMode',
	'__exitPreviewMode',
	'__onSelect',
	'__onUnselect',
	'__onChildSelected',
	'__isAnyChildSelected',
	'__shiftObject'
];

const EDITOR_ONLY_STATIC_METHODS = [
	'__isPropertyDisabled',
	'__EDITOR_tip',
	'__isScene',
	'__sourceCode',
	'__canAcceptParent',
	'__canAcceptChild',
	'__beforeChangeToThisType',
	'__validateObjectData'
];

const __checkClassesForEditorOnlyMethods = (classes: GameClasses) => {
	for (let key in classes) {
		const Class = classes[key];
		for (const propName of EDITOR_ONLY_METHODS) {
			if (Class.prototype.hasOwnProperty(propName)) {
				game.__showDebugError('Class ' + key + ' contains "' + propName + '" method, which has sense in editor only, and should be wrapped with "/// #if EDITOR", "/// #endif" tags', 99999);
			}
		}
		for (const propName of EDITOR_ONLY_STATIC_METHODS) {
			if (Class.hasOwnProperty(propName)) {
				game.__showDebugError('Class ' + key + ' contains "' + propName + '" static method, which has sense in editor only, and should be wrapped with "/// #if EDITOR", "/// #endif" tags', 99999);
			}
		}
	}
};
/// #endif

(Lib as any).loadPrefab = (name: string, omitInitialization = game.__EDITOR_mode): Container => { //moved here to keep auto typing generation (TLib) work
	assert(prefabs.hasOwnProperty(name), 'No prefab with name \'' + name + '\' registered in Lib', 10044);
	/// #if EDITOR
	if (!name.startsWith(EDITOR_BACKUP_PREFIX)) {
		prefabs[name].p.name = name;
	}
	showedReplaces = {};
	/// #endif
	const ret: Container = Lib._deserializeObject(prefabs[name]);
	/// #if EDITOR
	if (!omitInitialization) {
		/// #endif
		constructRecursive(ret);
		/// #if EDITOR
	}
	ret.__nodeExtendData.__deserializedFromPrefab = name;
	/// #endif
	return ret;
};

const _filterStaticTriggers = (childData: SerializedObject) => {
	return !childData[':'] || !childData[':'].some((cd) => {
		return (cd.c === 'StaticTrigger') && (!!cd.p.invert !== !getValueByPath(cd.p.dataPath || game.classes.StaticTrigger.__defaultValues.dataPath, game));
	});
};

const _filterStaticTriggersRecursive = (data: SerializedObject) => {
	if (data[':']) {
		let a = data[':'].filter(_filterStaticTriggers);
		data[':'] = a;
		a.forEach(_filterStaticTriggersRecursive);
	}
};

export { isAtlasAsset, removeHoldersToCleanup };

Lib.sounds = soundsHowlers;
