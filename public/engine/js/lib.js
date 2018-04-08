class Lib {

    constructor() {

        const objects = {};
        const scenes = {};

        const textures = {};

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

        this.wrapConstructorProcessor = (wrapper) => {
            var prevConstructor = constructorProcessor;
            constructRecursive = (o) => {
                prevConstructor(o);
                wrapper(o);
            }
        }

        this.addObject = (name, classRef) => {
            objects[name] = classRef;
        }

        this.addScene = (name, classRef) => {
            scenes[name] = classRef;
        }

        this.addTexture = (name, texture) => {
            textures[name] = texture;
        }

        this.loadObject = (name) => {
            var ret = new objects[name];
            constructRecursive(ret);
            return ret;
        }

        this.loadScene = (name) => {
            var ret = new scenes[name];
            constructRecursive(ret);
            return ret;
        }
    }
}

export default Lib;