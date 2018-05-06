class Scene extends PIXI.Container {
	constructor() {
		super();
		this.interactiveChildren = false;
		this.backgroundColor = 0;
	}
	
	onRemove() {}
	
	onShow() {
	
	}
	
	onHide() {
	
	}
	
	update() {
	
	}
	
	onShowInner() {
		this.onShow();
	}
	
	onHideInner() {
		this.onHide();
	}
}

export default Scene;


//EDITOR
Scene.EDITOR_icon = 'tree/scene';
Scene.EDITOR_editableProps = [
	{
		type: 'splitter',
		title: 'Scene:',
		name: 'speed'
	},
	{
		name: 'backgroundColor',
		type: 'color'
	}
	//TODO: isStatic, isNoStackable, faderType, music_intro, music_loop, music_volume, bgR, bgG, bgB
];

//ENDEDITOR