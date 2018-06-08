export default class Build {
	static build() {
		
		let scenesSrc = Lib._getAllScenes();
		let scenes = {};
		Object.keys(scenesSrc).some((sceneName) => {
			if(sceneName.indexOf(editor.editorFilesPrefix) !== 0) {
				scenes[sceneName] = scenesSrc[sceneName];
			}
		});
		
		let prefabsSrc = Lib._getAllPrefabs();
		let prefabs = {};
		Object.keys(prefabsSrc).some((prefabName) => {
			prefabs[prefabName] = prefabsSrc[prefabName];
		});
		
		let images = Lib.__texturesList.filter(n => n.value !== 'EMPTY' && n.value != 'WHITE').map((t) => {
			return t.value;
		});
		
		let fileSavePromises = [];
		
		fileSavePromises.push(editor.fs.saveFile('.dist/assets.json', {scenes, prefabs, images, projectDesc: editor.projectDesc}));
		

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
		};
		src.push('Lib._setClasses(classes, ');
		src.push(JSON.stringify(editor.ClassesLoader.classesDefaultsById, null, ' ') + ');');
		fileSavePromises.push(editor.fs.saveFile('.obj/classes.js', src.join('\n')));
		
		Promise.all(fileSavePromises).then(() => {
			editor.fs.getJSON('/fs/build').then((result) => {
				if(result.length > 0) {
					editor.ui.modal.showError(result.map((r, i) =>{
						return R.div({key:i}, r);
					}));
				} else {
					window.open('/games/' + editor.currentProjectDir + '/.dist');
				}
			});
		})
	}
}