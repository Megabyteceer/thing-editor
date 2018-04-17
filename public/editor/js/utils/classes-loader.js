var ClassesLoader = {};

const CUSTOM_CLASSES_ID = 100;

var loadedClasses = {};
var loadedClassesByName = {};
var loadedClassesIdsByName = {};

var classesIdCounter;
var customClassesIdCounter;

var cacheCounter = 0;

var embeddedClasses;

ClassesLoader.loaded = new Signal();

ClassesLoader.init = () => {
    //embedded engine classes
    embeddedClasses = [ //Do not ever delete any class
        Sprite,
        Scene
    ]; //Add new classes to the end of array only.
    assert(CUSTOM_CLASSES_ID > embeddedClasses.length);
}

//load custom game classes
const jsFiler = /^src\/.*\.js$/gm;
var head = document.getElementsByTagName('head')[0];

var cbCounter;
function checkIfLoaded(){
    cbCounter--;
    if(cbCounter === 0) {
        ClassesLoader.loaded.emit();
    }
}

ClassesLoader.reloadClasses = () => { //enums all ingame scripts, detect which exports PIXI.DisplayObject descendants and add them in to Lib.
    Lib.clearClasses();
    customClassesIdCounter = CUSTOM_CLASSES_ID;
    
    embeddedClasses.some(Lib.addClass);

    var dir = EDITOR.fs.gameFolder;
    cbCounter = 1;
    EDITOR.fs.files.some((fn) => {
        if(fn.match(jsFiler)) {

            cbCounter++;
            var src = '/fs/loadClass?c='+ encodeURIComponent(dir + fn)+'&nocache='+cacheCounter++;
            var script = document.createElement('script');
            script.onload = function(ev) {
                head.removeChild(ev.target);
                checkIfLoaded();
            };
            script.type = 'module';
            script.src = src;
            head.appendChild(script);
        }
    });
    checkIfLoaded();
}

ClassesLoader.classLoaded = (c) => {

    var name = c.name;
    var id;
    if(loadedClassesByName.hasOwnProperty(name)) {
        id = loadedClassesIdsByName[name];
    } else {
        id = customClassesIdCounter++;
        loadedClassesIdsByName[name] = id;
    }
    loadedClassesByName[name] = c;
    loadedClasses[id] = c;
    Lib.addClass(c, id);
}


export default ClassesLoader;