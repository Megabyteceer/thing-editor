import Pool from "./utils/pool.js";

let prefabs = {};
let scenes;
let classes;
let defaults;
let textures = {};
let staticScenes = {};

let noCacheCounter = 0;

let constructRecursive = (o) => {
	assert(!game.__EDITORmode, "initialization attempt in editing mode.");
	
	o.init();
	
	///#if EDITOR
	__getNodeExtendData(o).constructorCalled = true;
	///#endif
	
	let a = o.children;
	let arrayLength = a.length;
	for(let i = 0; i < arrayLength; i++) {
		constructRecursive(a[i]);
	}
}

class Lib {
	constructor() {
		assert(false, "Lib cant be instanced.");
		scenes = {'main': {c: 1}};
		classes = {1: Scene};
	}
	
	static getClass(id) {
		assert(classes.hasOwnProperty(id), "No class with name '" + name + "' registred in Lib");
		return classes[id];
	}
	
	static _setClasses(c, def) {
		defaults = def;
		classes = c;
		Lib.classes = c;
	}
	
	static _setScenes(s) {
		scenes = s;
		Lib.scenes = s;
	}
	
	static _setPrefabs(p) {
		prefabs = p;
		Lib.prefabs = p;
	}
	
	static addTexture(name, texture) {
		/// #if EDITOR
		if(!textures.hasOwnProperty(name)) {
			Lib.__texturesList.push({name, value: name});
		}
		/// #endif
		
		if(typeof texture === 'string') {
			/// #if EDITOR
			texture += '?noCahce=' + noCacheCounter++
			/// #endif
			textures[name] = PIXI.Texture.fromImage(texture);
		} else {
			textures[name] = texture;
		}
	}
	
	static __clearTexturesList() {
		textures = {};
		Lib.__texturesList = [];
	}
	
	static _loadClassInstanceById(id) {
		let ret = Pool.create(classes[id]);
		Object.assign(ret, defaults[id]);
		if(!game.__EDITORmode) {
			constructRecursive(ret);
		}
		return ret;
	}
	
	static hasTexture(name) {
		return textures.hasOwnProperty(name);
	}
	
	static getTexture(name) {
		
		/// #if EDITOR
		let exists = textures.hasOwnProperty(name);
		if(!exists) {
			assert(exists, "No texture with name '" + name + "' registred in Lib");
			return PIXI.Texture.EMPTY;
		}
		
		/// #endif
		
		return textures[name];
	}
	
	static loadPrefab(name) {
		assert(prefabs.hasOwnProperty(name), "No prefab with name '" + name + "' registred in Lib");
		/// #if EDITOR
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			prefabs[name].name = name;
		}
		/// #endif
		return _loadObjectFromData(prefabs[name]);
	}
	
	static destroyObjectAndChildrens(o) {
/// #if EDITOR
		if(__getNodeExtendData(o).constructorCalled) {
/// #endif
			o.onRemove();
/// #if EDITOR
		}
/// #endif
		
		o.detachFromParent();
		if(o.children) {
			while(o.children.length > 0) {
				Lib.destroyObjectAndChildrens(o.getChildAt(o.children.length - 1));
			}
		}
		Pool.dispose(o);
		/// #if EDITOR
		__resetNodeExtendData(o);
		/// #endif
	}
	
	static _deserializeObject(src) {
		assert(classes.hasOwnProperty(src.c), 'Unknown class id: ' + src.c);
		assert(defaults.hasOwnProperty(src.c), 'Class with id ' + src.c + ' has no default values set');
		let ret = Pool.create(classes[src.c]);
		Object.assign(ret, defaults[src.c], src.p);
		if(src.hasOwnProperty(':')) {
			src[':'].some((src) => {
				ret.addChild(Lib._deserializeObject(src));
			});
		}
		return ret;
	}
	
	static loadScene(name) {
		if(!game.__EDITORmode && staticScenes.hasOwnProperty(name)) {
			return staticScenes[name];
		}
		
		let isSceneExists = scenes.hasOwnProperty(name);
		assert(isSceneExists, "No scene with name '" + name + "'", true);
		if(!isSceneExists) {
			name = Object.keys(scenes)[0]; //get any scene
		}
		
		let s = _loadObjectFromData(scenes[name]);
		if(s.isStatic) {
			staticScenes[name] = s;
		}
		/// #if EDITOR
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			s.name = name;
		}
		/// #endif
		return s;
	}
	
	static hasScene(name) {
		return scenes.hasOwnProperty(name);
	}

/// #if EDITOR
	static __saveScene(scene, name, returnOnly) {
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			scene.name = name;
		}
		
		assert(typeof name === 'string');
		if(!scene) {
			assert(name === editor.editorFilesPrefix + 'tmp', 'Only temporary scene can be null');
			scenes[name] = undefined;
		} else {
			assert(editor.ClassesLoader.getClassType(scene.constructor) === Scene, "attempt to save not Scene instance in to scenes list.");
			let sceneData = Lib.__serializeObject(scene);
			scenes[name] = sceneData;
			editor.fs.saveFile(Lib.__sceneNameToFileName(name), sceneData, true);
		}
	}
	
	static __savePrefab(object, name) {
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			object.name = name;
		}
		assert(typeof name === 'string');
		assert(editor.ClassesLoader.getClassType(object.constructor) === PIXI.DisplayObject, "attempt to save Scene or not DisplayObject as prefab.");
		let prefabData = Lib.__serializeObject(object);
		prefabs[name] = prefabData;
		editor.fs.saveFile(Lib.__prefabNameToFileName(name), prefabData, true);
	}
	
	static __getNameByPrefab(prefab) {
		for(let name in prefabs) {
			if(prefabs[name] === prefab) {
				return name;
			}
		}
		assert(false, "unknown prefab name");
	}
	
	static __deleteScene(name) {
		return editor.fs.deleteFile(Lib.__sceneNameToFileName(name));
	}
	
	static __sceneNameToFileName(sceneName) {
		return 'scenes/' + sceneName + '.scene.json';
	}
	
	static __prefabNameToFileName(sceneName) {
		return 'prefabs/' + sceneName + '.prefab.json';
	}
	
	static _getAllScenes() {
		return scenes;
	}
	
	static _getAllPrefabs() {
		return prefabs;
	}
	
	static __clearStaticScenes() {
		staticScenes = {};
	}
	
	static _getStaticScenes() {
		return staticScenes;
	}
	
	static __serializeObject(o) {
		let props = {};
		let propsList = editor.enumObjectsProperties(o);
		
		if(o.__beforeSerialization) {
			o.__beforeSerialization();
		}
		
		propsList.some((p) => {
			if(!p.notSeriazable) {
				let val = o[p.name];
				if((val != p.default) && (typeof val != 'undefined') && (val !== null)) {
					props[p.name] = val;
				}
			}
		});
		assert(classes.hasOwnProperty(o.constructor.name), 'Attempt to serialize class ' + o.constructor.name + ' which was not loaded properly.');
		let ret = {
			c: o.constructor.name,
			p: props
		};
		if(o.children && o.children.length > 0) {
			ret[':'] = o.children.filter(__isSerializableObject).map(Lib.__serializeObject);
		}
		
		if(o.__afterSerialization) {
			o.__afterSerialization();
		}
		
		return ret;
	}

/// #endif

}

const _loadObjectFromData = (src) => {
	let ret = Lib._deserializeObject(src);
	if(!game.__EDITORmode) {
		constructRecursive(ret);
	}
	return ret;
}

/// #if EDITOR
Lib.__texturesList = [];
Lib.__constructRecursive = constructRecursive;

const __isSerializableObject = (o) => {
	return !__getNodeExtendData(o).hidden;
}

/// #endif

export default Lib;