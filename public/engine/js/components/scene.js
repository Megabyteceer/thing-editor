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
Scene.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Scene:',
		name: 'speed'
	},
	{
		name: 'isStatic',
		type: Boolean
	},
	{
		name: 'isNoStackable',
		type: Boolean
	},
	{
		name: 'backgroundColor',
		type: 'color'
	},
	{
		name: 'faderType',
		type: String
	}
	//TODO: music_intro, music_loop, music_volume
];

/// #endif