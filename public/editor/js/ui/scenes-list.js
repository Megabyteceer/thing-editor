var classViewProps = {className: 'vertical-layout'};
var bodyProps = {className: 'list-view', title:'Double click to open scene.'};


export default class ScenesList extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onSelect = this.onSelect.bind(this);
		EDITOR.sceneOpened.add(() =>{
		    this.forceUpdate();
        });
	}
	
	save() {
		EDITOR.saveCurrentScene(EDITOR.saveCurrentScene(EDITOR.projectDesc.currentSceneName));
	}
	
	saveAs() {
		//TODO: add save as dialogue
        
        assert(!ScenesList.isSpecialSceneName(enteredName), "Scene name is not allowed");
	}
    
    onSelect(item) {
		
	}
	
	renderItem(sceneName, item) {
        var cls = Lib.getClass(item.c);
		return R.div({onDoubleClick:() => {
		        EDITOR.loadScene(sceneName);
            },
            className:(item === this.state.selectedItem) ? 'unclickable' : undefined,
            key:sceneName
        }, R.listItem(R.span(null, R.classIcon(cls), sceneName + ' (' + cls.name + ')'), item, sceneName, this));
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
			R.div({className: bottomPanelClassName}, R.btn('Save', this.save), R.btn('Save As...', this.saveAs)),
			R.div(bodyProps, scenes)
		)
	}
	
	static isSpecialSceneName(sceneName) {
	    return sceneName.indexOf('.EDITOR~') === 0;
    }
}

