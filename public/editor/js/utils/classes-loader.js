import PropsFieldWrapper from '../ui/props-editor/props-field-wrapper.js';
import Pool from "/engine/js/utils/pool.js";
import Container from "../../../engine/js/components/container.js";

var ClassesLoader = {};

const CUSTOM_CLASSES_ID = 100;

var classesById = {},
	classesDefaultsById = {}, //default values for serializable properties of class
	classPathById = {};

var classesIdCounter;
var customClassesIdCounter;
var cacheCounter = 0;
var embeddedClasses;

var loadedClssesCount;

var classesLoadedSuccessfullyAtLeastOnce = false;
var classesRegisterLoaded = false;

ClassesLoader.classesLoaded = new Signal();

function init() {
	//embedded engine classes
	embeddedClasses = [ //Do not ever delete any class
		Sprite,
		Scene,
		Container
	]; //Add new classes to the end of array only.
	assert(CUSTOM_CLASSES_ID > embeddedClasses.length);
}

ClassesLoader.init = init;

var errorOccured;

function showError(message) {
	errorOccured = true;
	editor.ui.modal.showError(R.div(null,
		message,
		R.btn('I have fixed code, try again', () => {
			editor.ui.modal.closeModal();
			ClassesLoader.reloadClasses();
		}, 'check DeveloperTools (F12) for additiona error description', 'main-btn')),
		'Game source-code loading error.', !classesLoadedSuccessfullyAtLeastOnce);
}

function getClassType(c) {
	assert(typeof c === 'function');
	while (c) {
		if (c === Scene) return Scene;
		if (c === PIXI.DisplayObject) return PIXI.DisplayObject;
		c = c.__proto__;
	}
}

function addClass(c, path) {
	
	var classType = getClassType(c);
	if (!classType) return;
	
	var name = c.name;
	
	
	if (classPathById.hasOwnProperty(name)) {
		if (classPathById[name] !== path) {
			showError(R.div(null, 'class ', R.b(null, name), '" (' + path + ') overrides existing class ', R.b(null, (classPathById[name] || 'System class ' + name)), '. Please change your class name.'));
			return;
		}
	}
	
	if (path) {
		console.log('Custom class loded: ' + name + '; ' + path);
	}
	
	classPathById[name] = (((typeof path) === 'string') ? path : false);
	classesById[name] = c;
	
	var item = {c};
	if (classType === PIXI.DisplayObject) {
		ClassesLoader.gameObjClasses.push(item);
	} else {
		ClassesLoader.sceneClasses.push(item);
	}
	enumClassProperties(c);
}

function enumClassProperties(c) {
	var cc = c;
	var props = [];
	var defaults = {};
	var i = 50;
	while (cc && (i-- > 0)) {
		if (!cc.prototype) {
			throw 'attempt to enum editable properties of not PIXI.DisplayObject instance';
		}
		if (cc.hasOwnProperty('EDITOR_editableProps')) {
			var addProps = cc.EDITOR_editableProps;
			
			if (addProps.some((p) => {
				if (p.type === 'splitter') {
					p.notSeriazable = true;
				} else {
					if (!p.hasOwnProperty('default')) {
						p.default = PropsFieldWrapper.getTypeDescription(p).default;
					}
					defaults[p.name] = p.default;
					
					if(c === cc) { //own properties of this class
						if(p.type === Number || p.type === 'color' || p.type === 'select') {
							wrapPropertyWithNumberChecker(c, p.name);
						}
					}
					
				}
				return props.some((pp) => {
					return pp.name === p.name
				});
			})) {
				this.ui.showError('redefenition of property "' + pp.name + '"');
			}
			
			props = addProps.concat(props);
		}
		if (cc === PIXI.DisplayObject) {
			break;
		}
		cc = cc.__proto__;
	}
	c.EDITOR_propslist_cache = props;
	classesDefaultsById[c.name] = defaults;
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

function reloadClasses() { //enums all js files in src folder, detect which of them exports PIXI.DisplayObject descendants and add them in to Lib.
	assert(game.__EDITORmode, "Attempt to reload modules in runned mode.");
	return new Promise((resolve, reject) => {
		
		errorOccured = false;
		
		
		loadedClssesCount = 0;
		clearClasses();
		customClassesIdCounter = CUSTOM_CLASSES_ID;
		console.clear();
		console.log('%c editor: classes loading begin:', 'font-weight:bold; padding:10px; padding-right: 300px; font-size:130%; color:#040; background:#cdc;');
		
		enumClassProperties(PIXI.DisplayObject);
		enumClassProperties(Sprite);
		embeddedClasses.some((c) => {
			addClass(c, false);
		});
		
		window.onerror = function loadingErrorHandler(message, source, lineno, colno, error) {
			showError(R.fragment(
				message,
				R.div({className: 'error-body'}, source.split('?nocache=').shift().split(':' + location.port).pop() + ' (' + lineno + ':' + colno + ')', R.br(), message),
				'Plese fix error in source code and press button to try again:',
			));
		};
		
		var scriptSource = '';
		editor.fs.files.some((fn, i) => {
			if (fn.match(jsFiler)) {
				var classPath = fn;
				scriptSource += ("import C" + i + " from '" + location.origin + editor.fs.gameFolder + classPath + "?nocache=" + (cacheCounter++) + "'; editor.ClassesLoader.classLoaded(C" + i + ", '" + classPath + "');");
			}
		});
		
		var src = 'data:application/javascript,' + encodeURIComponent(scriptSource);
		
		var script = document.createElement('script');
		editor.ui.modal.showSpinner();
		script.onerror = function (er) {
			editor.ui.modal.hideSpinner();
		}
		script.onload = function (ev) {
			
			editor.ui.modal.hideSpinner();
			head.removeChild(script);
			
			window.onerror = null;
			if (!errorOccured) {
				Lib._setClasses(classesById, classesDefaultsById);
				
				classesLoadedSuccessfullyAtLeastOnce = true;
				
				console.log('Loading success.');
				console.log(loadedClssesCount + ' classes total.');
				resolve();
				
				ClassesLoader.classesLoaded.emit();
				Pool.clearAll();
			} else {
				reject();
				console.warn('classes were not loaded because of error.')
			}
		}
		script.type = 'module';
		script.src = src;
		head.appendChild(script);
	});
}

function classLoaded(c, path) {
	loadedClssesCount++;
	if(!c.hasOwnProperty('EDITOR_icon')) {
		c.EDITOR_icon = "tree/game";
	}
	
	addClass(c, path);
}

ClassesLoader.reloadClasses = reloadClasses;
ClassesLoader.classLoaded = classLoaded;
ClassesLoader.getClassType = getClassType;

export default ClassesLoader;