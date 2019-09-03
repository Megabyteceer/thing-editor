import PropsFieldWrapper from '../ui/props-editor/props-field-wrapper.js';
import Pool from "thing-engine/js/utils/pool.js";
import Container from "thing-engine/js/components/container.js";
import Button from "thing-engine/js/components/button.js";
import Text from "thing-engine/js/components/text.js";
import Label from "thing-engine/js/components/label.js";
import ProgressBar from "thing-engine/js/components/progress-bar.js";
import PrefabReference from "thing-engine/js/components/prefab-reference.js";
import Scissors from "thing-engine/js/components/scissors.js";
import NumberInput from "thing-engine/js/components/number-input.js";
import Trigger from "thing-engine/js/components/trigger.js";
import Resizer from "thing-engine/js/components/resizer.js";
import OrientationTrigger from "thing-engine/js/components/orientation-trigger.js";
import MovieClip from "thing-engine/js/components/movie-clip/movie-clip.js";
import NineSlicePlane from "thing-engine/js/components/nine-slice-plane.js";
import DSprite from "thing-engine/js/components/d-sprite.js";
import Scene from "thing-engine/js/components/scene.js";
import Lib from "thing-engine/js/lib.js";
import FlyText from "thing-engine/js/components/fly-text.js";
import Sprite from "thing-engine/js/components/sprite.js";
import DisplayObject from "thing-engine/js/components/display-object.js";
import Tilemap from "thing-engine/js/components/tilemap.js";
import Shape from "thing-engine/js/components/shape.js";
import Mask from "thing-engine/js/components/mask.js";
import Fill from "thing-engine/js/components/fill.js";
import Spawner from "thing-engine/js/components/spawner.js";
import SpawnerRing from "thing-engine/js/components/spawner-ring.js";
import ClickOutsideTrigger from "thing-engine/js/components/click-outside-trigger.js";
import ScrollLayer from "thing-engine/js/components/scroll-layer.js";
import game from "thing-engine/js/game.js";
import SelectionHighlighter from 'thing-engine/js/components/selection-highlighter.js';
import BgMusic from 'thing-engine/js/components/bg-music.js';
import Spine from 'thing-engine/js/components/spine.js';
import MobileJoystick from 'thing-engine/js/components/mobile-joystick.js';
import Delay from 'thing-engine/js/components/delay.js';
import HTMLOverlay from 'thing-engine/js/components/html-overlay.js';
import TextInput from 'thing-engine/js/components/text-input.js';
import ParticleContainer from 'thing-engine/js/components/particle-container.js';
import L from 'thing-engine/js/utils/l.js';

let attachedScript;

let ClassesLoader = {};
ClassesLoader.initClassesLoader = function initClassesLoader() {
	//embedded engine classes
	embeddedClasses = [
		[Container, "/thing-engine/js/components/container.js"],
		[Sprite, '/thing-engine/js/components/sprite.js'],
		[DSprite, "/thing-engine/js/components/d-sprite.js"],
		[MovieClip, "/thing-engine/js/components/movie-clip/movie-clip.js"],
		[Scene, "/thing-engine/js/components/scene.js"],
		[Text, "/thing-engine/js/components/text.js"],
		[FlyText, "/thing-engine/js/components/fly-text.js"],
		[Tilemap, "/thing-engine/js/components/tilemap.js"],
		[Button, "/thing-engine/js/components/button.js"],
		[Label, "/thing-engine/js/components/label.js"],
		[ProgressBar, "/thing-engine/js/components/progress-bar.js"],
		[NumberInput, "/thing-engine/js/components/number-input.js"],
		[Trigger,"/thing-engine/js/components/trigger.js" ],
		[Resizer,"/thing-engine/js/components/resizer.js" ],
		[OrientationTrigger,"/thing-engine/js/components/orientation-trigger.js" ],
		[ClickOutsideTrigger,"/thing-engine/js/components/click-outside-trigger.js" ],
		[ScrollLayer,"/thing-engine/js/components/scroll-layer.js" ],
		[SelectionHighlighter,"/thing-engine/js/components/selection-highlighter.js" ],
		[NineSlicePlane, "/thing-engine/js/components/nine-slice-plane.js"],
		[PrefabReference, "/thing-engine/js/components/prefab-reference.js"],
		[Scissors, "/thing-engine/js/components/scissors.js"],
		[Shape, "/thing-engine/js/components/shape.js"],
		[Mask, "/thing-engine/js/components/mask.js"],
		[Fill, "/thing-engine/js/components/fill.js"],
		[Spawner, "/thing-engine/js/components/spawner.js"],
		[SpawnerRing, "/thing-engine/js/components/spawner-ring.js"],
		[BgMusic, "/thing-engine/js/components/bg-music.js"],
		[Spine, "/thing-engine/js/components/spine.js"],
		[MobileJoystick, "/thing-engine/js/components/mobile-joystick.js"],
		[HTMLOverlay, "/thing-engine/js/components/html-overlay.js"],
		[TextInput, "/thing-engine/js/components/text-input.js"],
		[ParticleContainer, "/thing-engine/js/components/particle-container.js"]
	];
};

let classesById = {},
	classesDefaultsById = {}, //default values for serializable properties of class
	classPathById = {};

let cacheCounter = 0;
const embeddedClassesMap = new Map();
let embeddedClasses;
let loadedClssesCount;

let classesLoadedSuccessfullyAtLeastOnce = false;


let errorOccured;

let currentLoadingPromiseResolver;
function showError(message, errorCode) {
	errorOccured = true;
	
	let r = currentLoadingPromiseResolver;
	currentLoadingPromiseResolver = null;
	editor.ui.modal.showError(R.div(null,
		message,
		R.btn('I have fixed code, try again', () => {
			editor.ui.modal.hideModal();
			
			ClassesLoader.reloadClasses().then(() => {
				if(r) {
					r();
				}
			});
		}, 'check DeveloperTools (F12) for additiona error description', 'main-btn')),
	errorCode,
	'Game source-code loading error.', !classesLoadedSuccessfullyAtLeastOnce);
}

function getClassType(c) {
	assert(typeof c === 'function', 'Class expected');
	while (c) {
		if (c === Scene) return Scene;
		if (c === DisplayObject) return DisplayObject;
		c = c.__proto__;
	}
}

function addClass(c, path) {
	
	let classType = getClassType(c);
	if (!classType) return;
	
	let name = c.name;
	
	
	if (classPathById.hasOwnProperty(name)) {
		if (classPathById[name] !== path) {
			showError(R.div(null, 'class ', R.b(null, name), '" (' + path + ') overrides existing class ', R.b(null, (classPathById[name] || 'System class ' + name)), '. Please change your class name.'), 30008);
			return;
		}
	}
	
	if (path && (path.indexOf('/thing-engine/') < 0)) {
		console.log('Custom class loded: ' + name + '; ' + path);
	}
	
	classPathById[name] = (((typeof path) === 'string') ? path : false);
	classesById[name] = c;
	
	let item = {c};
	if (classType === DisplayObject) {
		ClassesLoader.gameObjClasses.push(item);
	} else {
		ClassesLoader.sceneClasses.push(item);
	}
	enumClassProperties(c);
}

function enumClassProperties(c) {
	let cc = c;
	let props = [];
	let defaults = {};
	let i = 50;
	
	let path;
	if(!loadedPath) {
		path = embeddedClasses.find((a) => {
			return a[0].name === c.name;
		});
		if(path) {
			path = path[1];
		}
	} else {
		path = loadedPath;
	}

	while (cc && (i-- > 0)) {
		if (!cc.prototype) {
			throw 'attempt to enum editable properties of not DisplayObject instance';
		}
		if (cc.hasOwnProperty('__EDITOR_editableProps')) {
			cc.__EDITOR_editableProps.some((p) => {
				assert(p.name, 'Class ' + c.name + ' has property with no name defined', 40001);
				assert(p.type, 'Class ' + c.name + ' has property "' + p.name + '" with no type defined.', 40002);
				let ownerClassName = c.name + ' (' + path + ')';
				p.owner = ownerClassName;
				
				props = props.filter((pp) => {
					if(pp.name === p.name) {
						if(!pp.override) {
							editor.ui.modal.showError('Redefinition of property "' + p.name + '" at class ' + ownerClassName + '. Already defined at: ' + pp.owner, 40004);
							editor.editClassSource(cc);
						} else {
							p = Object.assign({}, p, pp);
						}
						return false;
					} else {
						return true;
					}
				});

				if (p.type === 'splitter' || p.type === 'btn') {
					p.notSeriazable = true;
				} else {
					if (!p.hasOwnProperty('default')) {
						p.default = PropsFieldWrapper.getTypeDescription(p).default;
					}
					if(p.type === 'ref') {
						p.notSeriazable = true;
						defaults[p.name] = p.default;
					}
					if(!p.notSeriazable) {
						defaults[p.name] = p.default;
					}
					if(c === cc) { //own properties of this class
						if(!p.hasOwnProperty('noNullCheck') && (p.type === Number || p.type === 'color' || p.type === 'select')) {
							window.wrapPropertyWithNumberChecker(c, p.name);
						}
					}
				}
				props.unshift(p);
			});
		}
		if (cc === DisplayObject) {
			break;
		}
		cc = cc.__proto__;
	}
	c.__EDITOR_propslist_cache = props;
	classesDefaultsById[c.name] = defaults;
}

function clearClasses() {
	classesById = {};
	ClassesLoader.gameObjClasses = [];
	ClassesLoader.sceneClasses = [];
}

//load custom game classes
const jsFiler = /^src\/(game-objects|scenes)\/.*\.js$/gm;
let head = document.getElementsByTagName('head')[0];

function reloadClasses() { //enums all js files in src folder, detect which of them exports DisplayObject descendants and add them in to Lib.
	assert(game.__EDITORmode, "Attempt to reload modules in runned mode.");
	L.__clearUppercaseKeys();
	loadedPath = null;
	return new Promise((resolve) => {
		cacheCounter++;
		currentLoadingPromiseResolver = resolve;
		setTimeout(() => {
			errorOccured = false;
		
			loadedClssesCount = 0;
			clearClasses();
			console.clear();
			console.log('%c editor: classes loading begin:', 'font-weight:bold; padding:10px; padding-right: 300px; font-size:130%; color:#040; background:#cdc;');
		
			enumClassProperties(DisplayObject);
			enumClassProperties(Delay);
			embeddedClasses.some((a) => {
				let c = a[0];
				if(!c.___EDITOR_isGoodForCallbackChooser && !c.___EDITOR_isGoodForChooser) {
					c.___EDITOR_isHiddenForChooser = true;
				}
				embeddedClassesMap.set(c, true);
				addClass(c, a[1]);
			});
		
			window.onerror = function loadingErrorHandler(message, source, lineno, colno) {

				let fn = source.split('?').shift().split(':' + location.port).pop();
				editor.fs.editFile('../../' + fn, lineno, colno);
				showError(R.fragment(
					'Attempt to load: ' + loadedPath + ': ' + message,
					R.div({className: 'error-body'}, fn + ' (' + lineno + ':' + colno + ')', R.br(), message),
					'Please fix error in source code and press button to try again:'
				), 30009);
			};
		
			let scriptSource = '';
			editor.fs.files.some((fn, i) => {
				if(fn.match(jsFiler)) {
					let classPath = fn;
					scriptSource += ("import C" + i + " from '" + location.origin + game.resourcesPath + classPath + "?v=" + (cacheCounter) + "'; editor.ClassesLoader.classLoaded(C" + i + ", '" + classPath + "');");
				}
			});
		
			let src = 'data:application/javascript,' + encodeURIComponent(scriptSource);
		
			let script = document.createElement('script');
			editor.ui.modal.showSpinner();
			script.onerror = function() {
				showError("Can not load script; Please check Browser's console for error details, and fix problem to continue.", 31001);
				script.onload();
			};
			script.onload = function() {
			
				editor.ui.modal.hideSpinner();
				head.removeChild(script);
			
				window.onerror = null;
				if(!errorOccured) {
					Lib._setClasses(classesById, classesDefaultsById);
				
					classesLoadedSuccessfullyAtLeastOnce = true;
				
					console.log('Loading success.');
					console.log(loadedClssesCount + ' classes total.');
					resolve();
				
					editor.ui.classesList.forceUpdate();
					game.__destroyCurrentScene();
					Pool.clearAll();
				} else {
					console.warn('classes were not loaded because of error.');
				}
			};
			if(attachedScript) {
				attachedScript.remove();
			}
			attachedScript = script;
			script.type = 'module';
			script.src = src;
			head.appendChild(script);

		},10);
	});
}
let loadedPath;
function classLoaded(c, path) {
	loadedPath = path;
	loadedClssesCount++;
	if(!c.hasOwnProperty('__EDITOR_icon')) {
		c.__EDITOR_icon = "tree/game";
	}
	
	addClass(c, path);
}

function validateClasses() {
	let classOnValidation;
	let propertyName;
	let validationTimeout = setTimeout(() => {
		editor.editClassSource(classOnValidation);
		if(propertyName) {
			editor.ui.modal.showFatalError('Class validation error. ' + classOnValidation.name + ' throws error if filed ' + propertyName + ' assigned first.', 99999);
		} else {
			editor.ui.modal.showFatalError('Class validation error. ' + classOnValidation.name + ' throws error in constructor.', 99999);
		}
	}, 0);
	for(let name in Lib.classes) {
		classOnValidation = classesById[name];
		let p = classesDefaultsById[name];
		for(let propName in p) {
			propertyName = null;
			let o = new classOnValidation();
			propertyName = propName;
			o[propName] = p[propName];
			Object.assign(o, p);
		}
	}
	clearTimeout(validationTimeout);
}

ClassesLoader.isItEmbeddedClass = (c) => {
	return embeddedClassesMap.has(c);
};

ClassesLoader.validateClasses = validateClasses;
ClassesLoader.reloadClasses = reloadClasses;
ClassesLoader.classLoaded = classLoaded;
ClassesLoader.getClassType = getClassType;
ClassesLoader.classesDefaultsById = classesDefaultsById;
ClassesLoader.getClassPath = (name) => {
	return classPathById[name];
};

export default ClassesLoader;