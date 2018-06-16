import L from "../../../engine/js/utils/l.js";

export default class Build {
	static build() {
		
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
		
		fileSavePromises.push(editor.fs.saveFile('assets.json', {scenes, prefabs, images, text, projectDesc: editor.projectDesc}));
		

		let classesSrc = editor.ClassesLoader.gameObjClasses.concat(editor.ClassesLoader.sceneClasses);
		let src = [`let classes = {
			"Sprite":PIXI.Sprite,
			"DSprite":DSprite,
			"Scene":Scene
		};`];
		
		
		for(let c of classesSrc) {
			let name = c.c.name;
			let path = editor.ClassesLoader.getClassPath(name);
			if(path) {
				src.push('import ' + name + ' from "' + path + '"');
				src.push('classes["' + name + '"] = ' + name + ';');
			}
		}
		src.push('Lib._setClasses(classes, ');
		src.push(JSON.stringify(editor.ClassesLoader.classesDefaultsById, null, ' ') + ');');
		fileSavePromises.push(editor.fs.saveFile('src/classes.js', src.join('\n')));
		
		Promise.all(fileSavePromises).then(() => {
			editor.fs.getJSON('/fs/build').then((result) => {
				
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
					
					window.open('/games/' + editor.currentProjectDir + '/release');
				}
			});
		})
	}
}