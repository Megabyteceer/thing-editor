var prefabs = {};
var scenes;
var classes;
var defaults;
var textures = {};

var constructorProcessor = (o) => {
    if(o instanceof PIXI.Sprite) {
         o.texture = textures['bunny'];
    }
}

var constructRecursive = (o) => {
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
	    scenes = {'main':{c:1}};
	    classes = {1:Scene};
    }
    
    static wrapConstructorProcessor(wrapper) {
	    _wrapConstructorProcessor(wrapper);
    }
    
    static getClass(id) {
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
        textures[name] = texture;
    }
    
    static loadClassInstanceById(id) {
        var ret = new classes[id];
        constructRecursive(ret);
        return ret;
    }
    
    static loadPrefab(name) {
        return Lib._loadObjectFromData(prefabs[name]);
    }

    static _deserializeObject(src) {
        assert(classes.hasOwnProperty(src.c), 'Unknown class id: ' + src.c);
        assert(defaults.hasOwnProperty(src.c), 'Class with id ' + src.c + ' has no default values set');
        var ret = new classes[src.c]();
        Object.assign(ret, defaults[src.c], src.p);
        if(src.hasOwnProperty(':')){
            src[':'].some((src)=>{
                ret.addChild(Lib._deserializeObject(src));
            });
        }
        return ret;
    }
    
    static _loadObjectFromData(src) {
        var ret = Lib._deserializeObject(src);
        constructRecursive(ret);
        return ret;
    }
    
    static loadScene(name) {
        return Lib._loadObjectFromData(scenes[name]);
    }
    
    static hasScene(name) {
        return scenes.hasOwnProperty(name);
    }

//EDITOR
    static __saveScene(scene, name) {
        assert(typeof name === 'string');
        if(!scene) {
            assert(name === EDITOR.editorFilesPrefix + 'tmp', 'Only temporary scene can be null');
            scenes[name] = undefined;
        } else {
            assert(EDITOR.ClassesLoader.getClassType(scene.constructor) === Scene, "attempt to save not Scene instance in to scenes list.");
	        var sceneData = Lib.__serializeObject(scene);
            scenes[name] = sceneData;
            EDITOR.fs.saveFile(Lib.__sceneNameToFileName(name), sceneData, true);
        }
    }

    static __savePrefab(object, name) {
        assert(typeof name === 'string');
        assert(EDITOR.ClassesLoader.getClassType(object.constructor) === PIXI.DisplayObject, "attempt to save Scene or not DisplayObject as prefab.");
        var sceneData = Lib.__serializeObject(object);
        prefabs[name] = sceneData;
        EDITOR.fs.saveFile(Lib.__prefabNameToFileName(name), sceneData, true);
    }

    static __getNameByPrefab(prefab) {
        for(var name in prefabs) {
            if(prefabs[name] === prefab) {
                return name;
            }
        }
        assert(false, "unknown prefab name");
    }
    
    static __deleteScene(name) {
        return EDITOR.fs.deleteFile(Lib.__sceneNameToFileName(name));
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

    static __serializeObject(o) {
        var props = {};
        var propsList = EDITOR.enumObjectsProperties(o);
        propsList.some((p)=>{
            if(!p.notSeriazable) {
                var val = o[p.name];
                if(val != p.default) {
                    props[p.name] = val;
                }
            }
        })
        assert(classes.hasOwnProperty(o.constructor.name), 'Attempt to serialize class ' + o.constructor.name + ' which was not loaded properly.');
        var ret = {
            c:o.constructor.name,
            p:props
        }
        if(o.children && o.children.length > 0) {
            ret[':'] = o.children.map(Lib.__serializeObject);
        }
        return ret;
    }
//ENDEDITOR

}

export default Lib;