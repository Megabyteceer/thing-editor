import L from "thing-engine/js/utils/l.js";
import Lib from "thing-engine/js/lib.js";

let prefixToCutOff;

function isFileNameValidForBuild(prefabName) {
	return !prefabName.startsWith(prefixToCutOff) && (prefabName.indexOf('/' + prefixToCutOff) < 0);
}

function filterObjectsData(obj) {
	let ret = {};
	Object.keys(obj).filter(isFileNameValidForBuild).sort().some((name) => {
		ret[name] = obj[name];
	});
	return ret;
}

const filterChildrenByName = (childData) => {
	if(!childData.hasOwnProperty('p')) {
		return true;
	}
	if(childData.p.hasOwnProperty('name') &&
		childData.p.name.startsWith(prefixToCutOff)) {
		return false;
	}
	if(childData.p.hasOwnProperty('prefabName') &&
		!isFileNameValidForBuild(childData.p.prefabName)) {
		return false;
	}
	return true;
};

const fieldsFilter = (key, value) => {
	if(!key.startsWith(prefixToCutOff)) {
		if(key === ':' && Array.isArray(value)) { // cut off __ objects
			return value.filter(filterChildrenByName);
		}
		return value;
	}
	if(typeof value === 'object') { //its prefab or scene data
		if(isFileNameValidForBuild(key)) {
			return value;
		}
	}
};

let errorLinesStarted = false;
const isLineError = (l) => {
	if(l.startsWith('ERROR: ')) {
		errorLinesStarted = true;
	}
	if(l.startsWith('WARNING: ')) {
		errorLinesStarted = false;
	}
	return errorLinesStarted;
};

export default class Build {
	static build(debug) {
		prefixToCutOff = (debug ? '___' : '__');
		let scenes = filterObjectsData(Lib._getAllScenes());
		let prefabs = filterObjectsData(Lib._getAllPrefabs());
		
		let images = Lib.__texturesList.filter(n => n.value !== 'EMPTY' && n.value !== 'WHITE').map((t) => {
			return t.value;
		});
		images = images.slice().filter(isFileNameValidForBuild).sort();

		let resources;
		for(let r in Lib.resources) {
			if(!resources) {
				resources = [];
			}
			resources.push(r);
		}
		if(resources) {
			resources = resources.filter(isFileNameValidForBuild).sort();
		}
		
		let fileSavePromises = [];

		let sounds = filterObjectsData(Lib.__getSoundsData());
		/*
		let version = editor.projectDesc.version.split('.');
		let latest = parseInt(version.pop());
		latest++;
		version.push(latest);
		editor.projectDesc.version = version.join('.');
		editor.saveProjectDesc();*/

		let projectDesc = editor.projectDesc;
		let assetsDelimiter = projectDesc.__assetsDelimiter ? projectDesc.__assetsDelimiter : undefined;

		let assetsObj = {scenes, prefabs, images, resources, sounds, projectDesc};
		if(editor.projectDesc.embedLocales) {
			assetsObj.text = L.__getTextAssets();
		}

		fileSavePromises.push(editor.fs.saveFile('assets.js', 'window._thingEngineAssest = ' +
		JSON.stringify(assetsObj, fieldsFilter, assetsDelimiter) + ';', false, true));
		

		let classesSrc = editor.ClassesLoader.gameObjClasses.concat(editor.ClassesLoader.sceneClasses);
		let src = [`/* this file is generated by thing-editor.
Please do not modify it. Any changes will be owerriden anyway.*/

import Lib from "thing-engine/js/lib.js";
let classes = {};`];
		let defaults = {};
		
		for(let c of classesSrc) {
			let name = c.c.name;
			let path = editor.ClassesLoader.getClassPath(name);
			if(path) {

				if(path.startsWith('/')) {
					path = path.substr(1);
				}
				path = path.replace('games/' + editor.currentProjectDir, '');

				if(findClassNameInData(name, scenes) || findClassNameInData(name, prefabs)) { //only referenced classes
					src.push('import ' + name + ' from "' + path + '";');
					src.push('classes["' + name + '"] = ' + name + ';');
					defaults[name] = editor.ClassesLoader.classesDefaultsById[name];
				}
			}
		}
		src.push('Lib._setClasses(classes, ' + JSON.stringify(defaults, fieldsFilter, assetsDelimiter) + ');');
		fileSavePromises.push(editor.fs.saveFile('src/classes.js', src.join('\n'), false, true));
		
		Promise.all(fileSavePromises).then(() => {
			editor.fs.getJSON('/fs/build' + (debug ? '?debug=1' : '')).then((result) => {
				
				errorLinesStarted = false;

				if(result.find(isLineError)) {
					errorLinesStarted = false;
					editor.ui.modal.showError(R.div(null, R.div(null, "Build errors: "), result.filter(isLineError).map((r, i) =>{
						return R.div({key:i}, r);
					})), 30006);
				} else {
					let url = '/games/' + editor.currentProjectDir + (debug ? 'debug' : 'release');
					
					editor.openUrl(url);
							
					if(result.find((l) => {return l;})) {
						editor.ui.modal.showModal(result.map((r, i) =>{
							return R.div({key:i}, r);
						}));
					}
				}
			});
		});
	}
}

function findClassNameInData(name, data) {
	for(let prefabName in data) {
		if(findClassNameInPrefabData(name, data[prefabName])) return true;
	}
}

function findClassNameInPrefabData(name, data) {
	if(data.c === name) {
		return true;
	}
	if(data.hasOwnProperty(':')){
		return data[':'].some((d) => {
			return findClassNameInPrefabData(name, d);
		});
	}
}
