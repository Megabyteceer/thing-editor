class Scene extends PIXI.Container {
	constructor() {
		super();
		this.backgroundColor = 0;
	}
	
	onRemove() {}
	
	onShow() {
	
	}
	
	onHide() {
	
	}
	
	update() {
	
	}
}

export default Scene;


/// #if EDITOR
Scene.EDITOR_icon = 'tree/scene';

const faderProperty = {
	name: 'faderType',
	type: String
};

Object.defineProperty(faderProperty, 'select', {
	get:() => {
		var ret = [{name:'', value:''}];
		var a = Lib._getAllPrefabs();
		for(let name in a) {
			if(name.startsWith('fader/')) {
				ret.push({name:name, value:name})
			}
		}
		return ret;
	}
});

Scene.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Scene:',
		name: 'speed'
	},
	{
		name: 'isStatic',
		type: Boolean,
		tip: `Set <b>true</b> if <b>scene should not be destroyed after it once created.</b>
		When you leave 'static' scene and then enter it again, engine uses same scene's instance each time without destroying it.
May be useful for Storage or Inventory scenes where you should keep state of UI tabs and scroll lists on each entering.`
	},
	{
		name: 'isNoStackable',
		type: Boolean,
		tip: `Set <b>true</b> for <b>prevent storing this scene in scenes stack</b>.
Useful for "cut scenes" and "message scenes" which should be shown only once before entering to some another scene.`
	},
	{
		name: 'backgroundColor',
		type: 'color'
	},
	faderProperty
	//TODO: music_intro, music_loop, music_volume
];

/// #endif