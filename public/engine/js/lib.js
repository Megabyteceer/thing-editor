import Pool from "./utils/pool.js";

var prefabs = {};
var scenes;
var classes;
var defaults;
var textures = {};
var staticScenes = {};

var constructorProcessor = (o) => {
	o.init();
}

var constructRecursive = (o) => {
	assert(!game.__EDITORmode, "initialization attempt in editing mode.");
	constructorProcessor(o);
	
	var a = o.children;
	var arrayLength = a.length;
	for (var i = 0; i < arrayLength; i++) {
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
		if(!textures.hasOwnProperty(name)) {
			Lib.__texturesList.push({name, value:name});
		}
		if(typeof texture === 'string') {
			textures[name] = PIXI.Texture.fromImage(texture);
		} else {
			textures[name] = texture;
		}
	}
	
	static _loadClassInstanceById(id) {
		var ret = Pool.create(classes[id]);
		Object.assign(ret, defaults[id]);
		if(!game.__EDITORmode) {
			constructRecursive(ret);
		}
		return ret;
	}
	
	static getTexture(name) {
		assert(textures.hasOwnProperty(name), "No texture with name '" + name + "' registred in Lib");
		return textures[name];
	}
	
	static loadPrefab(name) {
		assert(prefabs.hasOwnProperty(name), "No prefab with name '" + name + "' registred in Lib");
		//EDITOR
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			prefabs[name].name = name;
		}
		//ENDEDITOR
		return _loadObjectFromData(prefabs[name]);
	}
	
	static destroyObjectAndChildrens(o) {
		
//EDITOR
		if(!game.__EDITORmode) {
			try {
//ENDEDITOR
				o.onRemove();
//EDITOR
			} catch (er) {
				if(!game.__EDITORmode) {
					editor.ui.modal.showError(er.message || er);
				}
			}
//ENDEDITOR
		}
		o.detachFromParent();
		if (o.children) {
			while(o.children.length > 0) {
				Lib.destroyObjectAndChildrens(o.getChildAt(o.children.length-1));
			}
		}
		Pool.dispose(o);
		//EDITOR
		__resetNodeExtendData(o);
		//ENDEDITOR
	}
	
	static _deserializeObject(src) {
		assert(classes.hasOwnProperty(src.c), 'Unknown class id: ' + src.c);
		assert(defaults.hasOwnProperty(src.c), 'Class with id ' + src.c + ' has no default values set');
		var ret = Pool.create(classes[src.c]);
		Object.assign(ret, defaults[src.c], src.p);
		if (src.hasOwnProperty(':')) {
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
		
		var isSceneExists = scenes.hasOwnProperty(name);
		assert(isSceneExists, "No scene with name '" + name + "'", true);
		if(!isSceneExists) {
			name = Object.keys(scenes)[0];
		}
		
		var s = _loadObjectFromData(scenes[name]);
		if(s.isStatic) {
			staticScenes[name] = s;
		}
		//EDITOR
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			s.name = name;
		}
		//ENDEDITOR
		return s;
	}
	
	static hasScene(name) {
		return scenes.hasOwnProperty(name);
	}

//EDOTOR
	static __saveScene(scene, name) {
		if(name.indexOf(editor.editorFilesPrefix) !== 0) {
			scene.name = name;
		}
		
		assert(typeof name === 'string');
		if (!scene) {
			assert(name === editor.editorFilesPrefix + 'tmp', 'Only temporary scene can be null');
			scenes[name] = undefined;
		} else {
			assert(editor.ClassesLoader.getClassType(scene.constructor) === Scene, "attempt to save not Scene instance in to scenes list.");
			var sceneData = Lib.__serializeObject(scene);
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
		var prefabData = Lib.__serializeObject(object);
		prefabs[name] = prefabData;
		editor.fs.saveFile(Lib.__prefabNameToFileName(name), prefabData, true);
	}
	
	static __getNameByPrefab(prefab) {
		for (var name in prefabs) {
			if (prefabs[name] === prefab) {
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
	
	static  __clearStaticScenes() {
		staticScenes = {};
	}
	
	static __serializeObject(o) {
		var props = {};
		var propsList = editor.enumObjectsProperties(o);
		propsList.some((p) => {
			if (!p.notSeriazable) {
				var val = o[p.name];
				if ((val != p.default) && (typeof val != 'undefined') && (val !== null)) {
					props[p.name] = val;
				}
			}
		})
		assert(classes.hasOwnProperty(o.constructor.name), 'Attempt to serialize class ' + o.constructor.name + ' which was not loaded properly.');
		var ret = {
			c: o.constructor.name,
			p: props
		}
		if (o.children && o.children.length > 0) {
			ret[':'] = o.children.map(Lib.__serializeObject);
		}
		return ret;
	}
//ENDEDITOR

}

const _loadObjectFromData = (src) => {
	var ret = Lib._deserializeObject(src);
	if(!game.__EDITORmode) {
		constructRecursive(ret);
	}
	return ret;
}

//EDITOR
Lib.__texturesList = [];
Lib.__constructRecursive = constructRecursive;
//ENDEDITOR

export default Lib;