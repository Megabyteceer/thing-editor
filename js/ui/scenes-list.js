import Group from "./group.js";
import Lib from "/thing-engine/js/lib.js";
import game from "/thing-engine/js/game.js";

let bodyProps = {className: 'list-view', title: 'Double click to open scene.'};

const sceneFileFiler = /^scenes\/.*\.scene.json$/gm;
const sceneExtRemover = /.scene.json$/gm;
const fileNameToSceneName = (fn) => {
	return fn.replace('scenes/', '').replace(sceneExtRemover, '');
};

let sceneNameProps = {
	className: "selectable-text", title: 'click to select scene`s name', onMouseDown: window.copyTextByClick
};

const sceneNameFilter = /[^a-z\-\/0-9]/g;

export default class ScenesList extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
	}
	
	onSaveSceneClick() {
		editor.saveCurrentScene();
	}
	
	onSaveAsSceneClick() {
		
		let defaultSceneName = editor.currentSceneName.split('/');
		defaultSceneName.pop();
		defaultSceneName = defaultSceneName.join('/');
		if (defaultSceneName) {
			defaultSceneName += '/';
		}
		
		editor.ui.modal.showPrompt('Enter name for scene:',
			defaultSceneName,
			(val) => { // filter
				return val.toLowerCase().replace(sceneNameFilter, '');
			},
			(val) => { //accept
				if (Lib.scenes.hasOwnProperty(val)) {
					return "Name already exists";
				}
				if (val.endsWith('/') || val.startsWith('/')) {
					return 'name can not begin or end with "/"';
				}
				
			}
		).then((enteredName) => {
			if (enteredName) {
				editor.saveCurrentScene(enteredName);
			}
		});
	}
	
	onSelect(item) {
		return item; //virtual method
	}
	
	renderItem(sceneName, item) {
		let cls = Lib.getClass(item.c);
		
		if(sceneName === editor.currentSceneName) {
			this.state.selectedItem = item;
		} else {
			this.state.selectedItem = null;
		}
		
		
		return R.div({
			onDoubleClick: () => {
				editor.ui.viewport.stopExecution();
				editor.openSceneSafe(sceneName);
			},
			key: sceneName
		}, R.listItem(R.span(null, R.classIcon(cls), R.b(sceneNameProps, sceneName), ' (' + cls.name + ')'), item, sceneName, this));
	}
	
	render() {
		let libsScenes = Lib._getAllScenes();
		let bottomPanelClassName = '';
		if (!editor.currentSceneName) {
			bottomPanelClassName += ' disabled';
			this.state.selectedItem = null;
		} else {
			this.state.selectedItem = libsScenes[editor.currentSceneName];
		}
		
		let scenes = [];
		for (let sceneName in libsScenes) {
			scenes.push(this.renderItem(sceneName, libsScenes[sceneName]));
		}
		
		scenes = Group.groupArray(scenes);
		
		return R.fragment(
			R.div({className: bottomPanelClassName},
				R.btn('Save', this.onSaveSceneClick, 'Save current Scene (Ctrl + S)', undefined, 1083),
				R.btn('Save As...', this.onSaveAsSceneClick, 'Save current scene under new name.')
			),
			R.div(bodyProps, scenes)
		);
	}
	
	static chooseScene(title, noEasyClose, filterCurrent = true) {
		
		let libsScenes = Lib._getAllScenes();
		
		let scenes = [];
		for (let sceneName in libsScenes) {
			if(!filterCurrent || sceneName !== game.currentScene.name) {
				let sceneData = libsScenes[sceneName];
				let c = Lib.getClass(sceneData.c);
				scenes.push({name:sceneName, __EDITOR_icon: c.__EDITOR_icon});
			}
		}
		return editor.ui.modal.showListChoose(title || "Choose scene", scenes, noEasyClose).then((choosed) => {
			if(choosed) {
				return choosed.name;
			}
			return null;
		});
	}
	
	static readAllScenesList() {
		let scenes = {};
		return Promise.all(
			editor.fs.files.filter(fn => fn.match(sceneFileFiler))
				.map((fn) => {
					return editor.fs.openFile(fn)
						.then((data) => {
							scenes[fileNameToSceneName(fn)] = data;
						});
				})
		).then(() => {
			Lib._setScenes(scenes);
		});
	}
	
	static isSpecialSceneName(sceneName) {
		return sceneName.indexOf(editor.editorFilesPrefix) === 0;
	}
}

