var objects = {};
var scenes = {};
var classesById = {};
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
        return classesById[id];
    }

    addClass(c, id) {
        assert(EDITOR, "Lib.addClass has sence for editor mode only");
        classesById[id] = c;
        self.EDITORclasses.push({id, c});
    }

    clearClasses() {
        assert(EDITOR, "Lib.clearClasses has sence for editor mode only");
        classesById = {};
        self.EDITORclasses = [];
        //TODO: clear pools
    }

    addTexture(name, texture) {
        textures[name] = texture;
    }

    loadObject(name) {
        var ret = new objects[name];
        constructRecursive(ret);
        return ret;
    }

    loadScene(name) {
        var ret = new scenes[name];
        constructRecursive(ret);
        return ret;
    }
}

self = window.Lib = new Lib();
export default 'this class is singletone. Use window.Lib';