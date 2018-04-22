var ClassesLoader = {};

const CUSTOM_CLASSES_ID = 100;
const CLASS_TYPE_SCENE = 1;
const CLASS_TYPE_DISPLAYOBJECT = 2;

var loadedClassesByName = {},
	loadedClassesIdsByName = {},
	classesById = {},
	classPathByName = {};

var classesIdCounter;
var customClassesIdCounter;
var cacheCounter = 0;
var embeddedClasses;

var loadedClssesCount, newLoadedClassesCount;

var classesLoadedSuccessfullyAtLeastOnce = false;
var classesRegisterLoaded = false;

ClassesLoader.classesLoaded = new Signal();

ClassesLoader.init = () => {
	//embedded engine classes
	embeddedClasses = [ //Do not ever delete any class
		Sprite,
		Scene
	]; //Add new classes to the end of array only.
	assert(CUSTOM_CLASSES_ID > embeddedClasses.length);
}

function saveClassesRegister() {
	var content = {};
	Object.keys(classesById).some((id) => {
		var name = classesById[id].name;
		content[id] = {
			name: name,
			path: classPathByName[name]
		}
	});
	return EDITOR.fs.saveFile('data/classes.json', content);
}

function loadClassesRegister() {
	if (classesRegisterLoaded) {
		return Promise.resolve();
	}
	return new Promise((resolve, reject) => {
		EDITOR.fs.openFile('data/classes.json').then((data) => {
			if (data) {
				for (var id in data) {
					var desc = data[id];
					var className = desc.name;
					loadedClassesIdsByName[className] = parseInt(id);
					classPathByName[className] = desc.path;
				}
				classesRegisterLoaded = true;
				resolve();
			} else {
				reject();
				showError('Classes list "data/classes.json" loading error.');
			}
		}).catch(reject);
	});
}

var errorOccured;

function showError(message) {
	errorOccured = true;
	EDITOR.ui.modal.showError(R.div(null,
		message,
		R.btn('Im have fixed code, try again', () => {
			EDITOR.ui.modal.closeModal();
			ClassesLoader.reloadClasses();
		}, 'check DeveloperTools (F12) for additiona error description', 'main-btn')),
		'Game source-code loading error.', !classesLoadedSuccessfullyAtLeastOnce);
}

function getClassType(c) {
	while (c) {
		if (c === Scene) return CLASS_TYPE_SCENE;
		if (c === PIXI.DisplayObject) return CLASS_TYPE_DISPLAYOBJECT;
		c = c.__proto__;
	}
}

function addClass(c, id, path) {
	
	var classType = getClassType(c);
	if (!classType) return;
	
	var name = c.name;
	if (path) {
		console.log('Custom class loded: ' + name + '; id:' + id + '; ' + path);
	}
	
	
	if (classPathByName.hasOwnProperty(name)) {
		if (classPathByName[name] !== path) {
			showError(R.span(null, 'class ', R.b(null, name), '" (' + path + ') overrides existing class ', R.b(null, (classPathByName[name] || 'System class ' + name)), '. Please change your class name.'));
			return;
		}
	}
	classPathByName[name] = (((typeof path) === 'string') ? path : false);
	
	loadedClassesByName[name] = c;
	classesById[id] = c;
	var item = {id, c};
	if (classType === CLASS_TYPE_DISPLAYOBJECT) {
		ClassesLoader.gameObjClasses.push(item);
	} else {
		ClassesLoader.sceneClasses.push(item);
	}
}

function clearClasses() {
	classesById = {};
	ClassesLoader.gameObjClasses = [];
	ClassesLoader.sceneClasses = [];
	//TODO: clear Lib.pools
}

//load custom game classes
const jsFiler = /^src\/.*\.js$/gm;
var head = document.getElementsByTagName('head')[0];

ClassesLoader.reloadClasses = () => { //enums all js files in src folder, detect which of them exports PIXI.DisplayObject descendants and add them in to Lib.
	errorOccured = false;
	loadClassesRegister().then(() => {
		
		loadedClssesCount = newLoadedClassesCount = 0;
		clearClasses();
		customClassesIdCounter = CUSTOM_CLASSES_ID;
		console.clear();
		console.log('%c EDITOR: classes loading begin:', 'font-weight:bold; padding:10px; padding-right: 300px; font-size:130%; color:#040; background:#cdc;');
		
		embeddedClasses.some((c, id) => {
			addClass(c, id, false);
		});
		
		window.onerror = function loadingErrorHandler(message, source, lineno, colno, error) {
			showError(R.div(null,
				message,
				R.div({className: 'error-body'}, source.split('?nocache=').shift().split(':' + location.port).pop() + ' (' + lineno + ':' + colno + ')', R.br(), message),
				'Plese fix error in source code and press button to try again:',
			));
			waitToLoadPromise.reject();
			loadersRejectors.some((p) => {
				p();
			});
		};
		
		var loaders = [];
		var loadersRejectors = [];
		
		EDITOR.fs.files.some((fn) => {
			if (fn.match(jsFiler)) {
				loaders.push(new Promise((resolve, reject) => {
					loadersRejectors.push(reject);
					var src = '/fs/loadClass?c=' + encodeURIComponent(fn) + '&nocache=' + cacheCounter++;
					//TODO: fs/loadClasses  - filter and load all classes on server side in one request.
					var script = document.createElement('script');
					EDITOR.ui.modal.showSpinner();
					script.onload = function (ev) {
						EDITOR.ui.modal.hideSpinner();
						head.removeChild(ev.target);
						resolve();
					}
					script.type = 'module';
					script.src = src;
					head.appendChild(script);
				}));
				
			}
		});
		
		var loadingAllPromise = Promise.all(loaders).finally(() => {
			window.onerror = null;
			if (!errorOccured) {
				Lib._setClasses(classesById);
				saveClassesRegister().then(() => {
					classesLoadedSuccessfullyAtLeastOnce = true;
					
					console.log('Loading success.');
					console.log(loadedClssesCount + ' classes updated.');
					if (newLoadedClassesCount > 0) {
						console.log(newLoadedClassesCount + ' new classes added.');
					}
					waitToLoadPromise.resolve();
				});
			} else {
				waitToLoadPromise.reject();
				console.warn('classes were not loaded because of error.')
			}
		});
	});
	
	var waitToLoadPromise = new Promise((resolve, reject) => {
		setTimeout(() => {
			waitToLoadPromise.resolve = resolve;
			waitToLoadPromise.reject = reject;
		}, 0);
	});
	waitToLoadPromise.then(() => {
		ClassesLoader.classesLoaded.emit()
	});
	return waitToLoadPromise;
}

ClassesLoader.classLoaded = (c, path) => {
	var name = c.name;
	
	var id;
	if (loadedClassesIdsByName.hasOwnProperty(name)) {
		id = loadedClassesIdsByName[name];
		loadedClssesCount++;
	} else {
		id = customClassesIdCounter++;
		loadedClassesIdsByName[name] = id;
		console.warn('New class ' + name + '. id ' + id + ' was assigned.');
		newLoadedClassesCount++;
	}
	addClass(c, id, path);
}


export default ClassesLoader;