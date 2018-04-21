var objects = {};
var scenes = {};
var classes;
var textures = {};

//EDITOR
var classesIdByName = {};
//ENDEDITOR

function getInstanceByClassId(id) {
    return new classes[id]();
}

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

var classIdCounter = 0;
var customClassIdCounter = 0;

var self;
class Lib {

    wrapConstructorProcessor(wrapper) {
        var prevConstructor = constructorProcessor;
        constructRecursive = (o) => {
            prevConstructor(o);
            wrapper(o);
        }
    }

    addObject(name, classRef) {
        objects[name] = classRef;
    }

    getClass(id) {
        return classes[id];
    }

    setClasses(c) {
        classes = c;
        this.classes = c;
//EDITOR
        Object.keys(c).some((id)=> {
            classesIdByName[c[id].name] = parseInt(id);
        });
//ENDEDITOR
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
        assert(classes.hasOwnProperty(src.c), 'Unknown class id: '+ src.c);
        var ret = new classes[src.c]();
        Object.assign(ret, src.p);
        if(src.hasOwnProperty(':')){
            src[':'].some((src)=>{
                ret.addChild(this.deserializeObject(src));
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
        if(!scene) {
            assert(name === 'EDITOR:tmp', 'Only temporary scene can be null');
            scenes[name] = undefined;
        } else {
            scenes[name] = this.__serializeObject(scene);
        }
    }
    
    __serializeObject(o) {
        var props = {};
        var propsList = EDITOR.enumObjectsProperties(o);
        propsList.some((p)=>{
            if(!p.noSave) {
                props[p.name] = o[p.name];
            }
        })
        var ret = {
            c:classesIdByName[o.constructor.name],
            p:props
        }
        if(o.children && o.children.length > 0) {
            ret[':'] = o.children.map(this.__serializeObject);
        }
        return ret;
    }
//ENDEDITOR

}

self = window.Lib = new Lib();
export default 'this class is singletone. Use window.Lib';