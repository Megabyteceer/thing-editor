var ClassesLoader = {};

const CUSTOM_CLASSES_ID = 100;
const CLASS_TYPE_SCENE = 1;
const CLASS_TYPE_DISPLAYOBJECT = 2;

var loadedClasses,
    loadedClassesByName = {},
    loadedClassesIdsByName = {},
    classesById = {},
    classPathByName = {};

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

function getClassType(c) {
    while(c) {
        if(c === Scene) return CLASS_TYPE_SCENE;
        if(c === PIXI.DisplayObject) return CLASS_TYPE_DISPLAYOBJECT;
        c = c.__proto__;
    }
}

function addClass(c, id, path) {
    
    var classType = getClassType(c);
    if (!classType) return;

    classPathByName[c.name] = ((typeof path === 'String') ? path : false);

    loadedClassesByName[c.name] = c;
    loadedClasses[id] = c;
    classesById[id] = c;
    var item = {id, c};
    if (classType === CLASS_TYPE_DISPLAYOBJECT) {
        ClassesLoader.gameObjClasses.push(item);
    } else {
        ClassesLoader.sceneClasses.push(item);
    }
    
}

function clearClasses() {
    classPathByName = {};
    loadedClasses = {};
    loadedClassesByName = {};
    classesById = {};
    ClassesLoader.gameObjClasses = [];
    ClassesLoader.sceneClasses = [];
    //TODO: clear Lib.pools
}

//load custom game classes
const jsFiler = /^src\/.*\.js$/gm;
var head = document.getElementsByTagName('head')[0];

var cbCounter;
function checkIfLoaded(){
    cbCounter--;
    if(cbCounter === 0) {
        Lib.setClasses(classesById);
        ClassesLoader.loaded.emit();
    }
}

ClassesLoader.reloadClasses = () => { //enums all js files in src folder, detect which of them exports PIXI.DisplayObject descendants and add them in to Lib.
    clearClasses();
    customClassesIdCounter = CUSTOM_CLASSES_ID;
    
    embeddedClasses.some(addClass);

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

ClassesLoader.classLoaded = (c, path) => {

    var name = c.name;

    if(classPathByName.hasOwnProperty(name)) {
        if(classPathByName[name] !== path) {
            EDITOR.ui.modal.showError(R.span(null, 'class ', R.b(null, name), '" ('+path+') overrides existing class ', R.b(null, (classPathByName[name] || 'System class '+name)), '. Please change your class name.'),'Class loading error');
            return;
        }
    }
	TODO: fix wrong order loading (Scene instead of Bunny)
    var id;
    if(loadedClassesByName.hasOwnProperty(name)) {
        id = loadedClassesIdsByName[name];
    } else {
        id = customClassesIdCounter++;
        loadedClassesIdsByName[name] = id;
    }
    addClass(c, id, path);
}


export default ClassesLoader;