export default class Build {
	static build() {
		
		var scenesSrc = Lib._getAllScenes();
		var scenes = {};
		Object.keys(scenesSrc).some((sceneName) => {
			if(sceneName.indexOf(editor.editorFilesPrefix) !== 0) {
				scenes[sceneName] = scenesSrc[sceneName];
			}
		});
		
		var prefabsSrc = Lib._getAllPrefabs();
		var prefabs = {};
		Object.keys(prefabsSrc).some((prefabName) => {
			prefabs[prefabName] = prefabsSrc[prefabName];
		});
		
		var images = Lib.__texturesList.filter(n => n.value !== 'EMPTY' && n.value != 'WHITE').map((t) => {
			return t.value;
		});
		
		var fileSavePromises = [];
		
		fileSavePromises.push(editor.fs.saveFile('.dist/assets.json', {scenes, prefabs, images}));
		

		var classesSrc = editor.ClassesLoader.gameObjClasses.concat(editor.ClassesLoader.sceneClasses);
		var src = [`var classes = {
			"Sprite":PIXI.Sprite,
			"DSprite":DSprite,
			"Scene":Scene
		};`];
		
		
		for(let c of classesSrc) {
			var name = c.c.name;
			var path = editor.ClassesLoader.getClassPath(name);
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