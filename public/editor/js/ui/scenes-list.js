var classViewProps = {className: 'vertical-layout'};
var bodyProps = {className: 'list-view', title:'Double click to open scene.'};

const sceneFileFiler = /^scenes\/.*\.scene.json$/gm;
const sceneExtRemover = /.scene.json$/gm;
const fileNameToSceneName = (fn) => {
    return fn.replace('scenes/', '').replace(sceneExtRemover, '');
}
export default class ScenesList extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
	}
	
	onSaveSceneClick() {
		EDITOR.saveCurrentScene(EDITOR.projectDesc.currentSceneName);
	}
    
    onSaveAsSceneClick() {
		//im here: TODO: requireString dialog -> save scene as with check name is unique
        EDITOR.ui.modal.promptShow('Enter name for scene:').then((enteredName) => {
            if(ScenesList.isSpecialSceneName(enteredName)) {
                EDITOR.ui.modal.showError("Scene name is not allowed.");
            } else {
                EDITOR.saveCurrentScene(enteredName);
                EDITOR.ui.modal.closeModal();
            }
        });
	}
    
    onSelect(item) {
		
	}
	
	renderItem(sceneName, item) {
        var cls = Lib.getClass(item.c);
		return R.div({onDoubleClick:() => {
		        EDITOR.loadScene(sceneName);
            },
            key:sceneName
        }, R.listItem(R.span(null, R.classIcon(cls), R.b(null,sceneName), '; (' + cls.name + ')'), item, sceneName, this));
	}
	
	render () {
		var libsScenes = Lib._getAllScenes();
		var currentSceneName = EDITOR.projectDesc && EDITOR.projectDesc.currentSceneName;
		
		var bottomPanelClassName = '';
		if (!currentSceneName) {
			bottomPanelClassName += ' disabled';
			this.state.selectedItem = null;
		} else {
            this.state.selectedItem = libsScenes[currentSceneName];
		}
				
        var scenes = [];
        for(var sceneName in libsScenes) {
            if(!ScenesList.isSpecialSceneName(sceneName)) {
                scenes.push(this.renderItem(sceneName, libsScenes[sceneName]));
            }
        }
		return R.div(classViewProps,
			R.div({className: bottomPanelClassName}, R.btn('Save', this.onSaveSceneClick, 'Save current scene'), R.btn('Save As...', this.onSaveAsSceneClick, 'Save current scene under new name.')),
			R.div(bodyProps, scenes)
		)
	}
	
	static loadScenes() {
	    var scenes = {};
	    return Promise.all(
            EDITOR.fs.files.filter(fn => fn.match(sceneFileFiler))
            .map((fn) => {
                return EDITOR.fs.openFile(fn)
                .then((data) => {
                    scenes[fileNameToSceneName(fn)] = data;
                });
            })
        ).then(() => {
	        Lib._setScenes(scenes)
        });
    }
	
	static isSpecialSceneName(sceneName) {
	    return sceneName.indexOf(EDITOR.editorFilesPrefix) === 0;
    }
}

