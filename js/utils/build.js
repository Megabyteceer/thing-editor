import L from "/thing-engine/js/utils/l.js";
import Lib from "/thing-engine/js/lib.js";

export default class Build {
	static build(debug) {
		
		let scenes = Lib._getAllScenes();
		
		let prefabsSrc = Lib._getAllPrefabs();
		let prefabs = {};
		Object.keys(prefabsSrc).sort().some((prefabName) => {
			prefabs[prefabName] = prefabsSrc[prefabName];
		});
		
		let images = Lib.__texturesList.filter(n => n.value !== 'EMPTY' && n.value != 'WHITE').map((t) => {
			return t.value;
		});
		
		let fileSavePromises = [];
		
		
		let text = L.__getTextAssets();
		
		fileSavePromises.push(editor.fs.saveFile('assets.js', 'window._thingEngineAssest = ' + JSON.stringify({scenes, prefabs, images, text, projectDesc: editor.projectDesc}) + ';'));
		

		let classesSrc = editor.ClassesLoader.gameObjClasses.concat(editor.ClassesLoader.sceneClasses);
		let src = [`import Lib from "/thing-engine/js/lib.js";
let classes = {};`];
		let defaults = {};
		
		for(let c of classesSrc) {
			let name = c.c.name;
			let path = editor.ClassesLoader.getClassPath(name);
			if(path) {
				if(findClassNameInData(name, scenes) || findClassNameInData(name, prefabs)) { //only referenced classes
					src.push('import ' + name + ' from "' + path + '";');
					src.push('classes["' + name + '"] = ' + name + ';');
					defaults[name] = editor.ClassesLoader.classesDefaultsById[name];
				}
			}
		}
		src.push('Lib._setClasses(classes, ');
		src.push(JSON.stringify(defaults, null, ' ') + ');');
		fileSavePromises.push(editor.fs.saveFile('src/classes.js', src.join('\n')));
		
		Promise.all(fileSavePromises).then(() => {
			editor.fs.getJSON('/fs/build' + (debug ? '?debug=1' : '')).then((result) => {
				
				if(result.errors.length > 0) {
					editor.ui.modal.showError(result.errors.map((r, i) =>{
						return R.div({key:i}, r);
					}));
				} else {
					
					if(result.warnings.length > 0) {
						editor.ui.modal.showModal(result.warnings.map((r, i) =>{
							return R.div({key:i}, r);
						}));
					}
					
					window.open('/games/' + editor.currentProjectDir + (debug ? '/debug' : '/release'));
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
