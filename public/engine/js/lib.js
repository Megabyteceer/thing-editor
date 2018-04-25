var objects = {};
var scenes;
var classes;
var defaults;
var textures = {};

var constructorProcessor = (o) => {
    if(o instanceof PIXI.Sprite) {
         o.texture = textures['bunny'];
    }
}
var _wrapConstructorProcessor = (wrapper) => {
	var prevConstructor = constructRecursive;
	constructRecursive = (o) => {
		prevConstructor(o);
		wrapper(o);
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
        assert(!scenes, "Attempt to create Lib secondary. It is singleton.");
	    scenes = {'main':{c:1}};
	    classes = {1:Scene};
    }
    
    wrapConstructorProcessor(wrapper) {
	    _wrapConstructorProcessor(wrapper);
    }

    getClass(id) {
        return classes[id];
    }

    _setClasses(c, def) {
        defaults = def;
        classes = c;
        this.classes = c;
    }
    
    _setScenes(s){
        scenes = s;
        this.scenes = s;
    }

    addTexture(name, texture) {
        textures[name] = texture;
    }

    loadClassInstanceById(id) {
        var ret = new classes[id];
        constructRecursive(ret);
        return ret;
    }

    loadObject(name) {
        return window.Lib.loadClassInstanceById(100);
        var ret = new objects[name]; //getInstanceByClassId
        constructRecursive(ret);
        return ret;
    }
    
    _deserializeObject(src) {
        assert(classes.hasOwnProperty(src.c), 'Unknown class id: ' + src.c);
        assert(defaults.hasOwnProperty(src.c), 'Class with id ' + src.c + ' has no default values set');
        var ret = new classes[src.c]();
        Object.assign(ret, defaults[src.c], src.p);
        if(src.hasOwnProperty(':')){
            src[':'].some((src)=>{
                ret.addChild(this._deserializeObject(src));
            });
        }
        return ret;
    }

    loadScene(name) {
        var ret = this._deserializeObject(scenes[name]);
        constructRecursive(ret);
        return ret;
    }

    hasScene(name) {
        return scenes.hasOwnProperty(name);
    }

//EDITOR
    __saveScene(scene, name) {
        assert(typeof name === 'string');
        if(!scene) {
            assert(name === EDITOR.editorFilesPrefix + 'tmp', 'Only temporary scene can be null');
            scenes[name] = undefined;
        } else {
	        assert(scene instanceof Scene, "Scene instance expected");
	        var sceneData = Lib.__serializeObject(scene)
            scenes[name] = sceneData;
            EDITOR.fs.saveFile('scenes/'+name+'.scene.json', sceneData, true);
        }
    }
    
    _getAllScenes() {
        return scenes;
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