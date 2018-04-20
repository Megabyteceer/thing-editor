var objects = {};
var scenes = {};
var classes;
var textures = {};


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

    addScene(name, classRef) {
        scenes[name] = classRef;
    }

    getClass(id) {
        return classes[id];
    }

    setClasses(c) {
        classes = c;
        this.classes = c;
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
    
    saveScene(scene, name) {
        im here (
    }

    loadScene(name) {
        var ret = new scenes[name];
        constructRecursive(ret);
        return ret;
    }
}

self = window.Lib = new Lib();
export default 'this class is singletone. Use window.Lib';