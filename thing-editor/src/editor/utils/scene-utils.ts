import loadSafeInstanceByClassName from 'thing-editor/src/editor/utils/load-safe-instance-by-class-name';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type Scene from 'thing-editor/src/engine/lib/assets/src/basic/scene.c';

function onNewSceneClick() {
	game.editor.askSceneToSaveIfNeed();

	askNewSceneName('New scene name').then((enteredName) => {
		if (enteredName) {
			game.editor.chooseClass(true, '_newScene', 'Select type for new scene:').then((selectedClass) => {
				if (selectedClass) {
					const scene = loadSafeInstanceByClassName(selectedClass);
					Lib.__saveScene(scene as Scene, enteredName);
					Lib.destroyObjectAndChildren(scene);
					game.editor.openScene(enteredName);
				}
			});
		}
	});
}

const sceneNameFilter = /[^a-z\-\/0-9]/g;

function askNewSceneName(title: string, defaultSceneName = ''): Promise<string> {
	return game.editor.ui.modal.showPrompt(title,
		defaultSceneName,
		(val) => { // filter
			return val.toLowerCase().replace(sceneNameFilter, '');
		},
		(val) => { //accept
			if (Lib.scenes.hasOwnProperty(val)) {
				return 'Scene with such name already exists';
			}
			if (val.endsWith('/') || val.startsWith('/')) {
				return 'name can not begin or end with "/"';
			}
		}
	);
}

function onSaveAsSceneClick() {
	let defaultSceneNameParts = game.editor.currentSceneName.split('/');
	defaultSceneNameParts.pop();
	let defaultSceneName = defaultSceneNameParts.join('/');
	if (defaultSceneName) {
		defaultSceneName += '/';
	}
	askNewSceneName('Save scene as', defaultSceneName).then((enteredName) => {
		if (enteredName) {
			game.editor.saveCurrentScene(enteredName);
			game.editor.ui.forceUpdate();
		}
	});
}

export { onNewSceneClick, onSaveAsSceneClick };
