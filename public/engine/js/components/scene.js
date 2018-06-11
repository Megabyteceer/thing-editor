export default class Scene extends PIXI.Container {
	constructor() {
		super();
		this.backgroundColor = 0;
	}

	onShow() {
		
	}
	
	onHide() {
		
	}
	
	init() {
		super.init();
		this._refreshAllObjectRefs();
	}
	
	_refreshAllObjectRefs() { //shortcut to access to scene's children by name without iterate through hierarchy
		this.all = {};	
			
		/// #if EDITOR
		addAllRefsValidator(this);
		/// #endif
		
		allObjectToRefresh = this.all;
		
		this.forAllChildren(_refreshChildRef);
	}
}

let allObjectToRefresh;
const _refreshChildRef = (o) => {
	if(o.name) {
		allObjectToRefresh[o.name] = o;
	}
};

/// #if EDITOR


let validatorCounter = 0;
function addAllRefsValidator(scene) {
	let refsCounter = {};
	let deletionValidator = validatorCounter++;
	
	scene.all = new Proxy(scene.all, {
		get:(target, prop) => {
			
			if(!target.hasOwnProperty(prop)) {
				target[prop];
			}
			let ret = target[prop];
			if(!game.__EDITORmode) {
				let refsWithThanNameCount = refsCounter[prop];
				assert(ret instanceof PIXI.DisplayObject, "Attempt to access to object 'all." + prop + "'. But " + refsWithThanNameCount + " object with that name present on scene " + scene.name + "(" + scene.constructor.name + ").");
				assert(!refsWithThanNameCount || refsWithThanNameCount === 1, "Attempt to access to object 'all." + prop + "'. But " + refsWithThanNameCount + " object with name '" + prop + "' present on scene " + scene.name + "(" + scene.constructor.name + ").");
				assert(ret, "Attempt to access to scene object 'all." + prop + "'. Reference is empty: " + ret);
				assert(__getNodeExtendData(ret).__allRefsDeletionValidator === deletionValidator, "Attempt to access to scene object 'all." + prop + "'. Reference to object is presents, but this object was removed from scene already. Use 'all' path only for static objects which never deleted from scene.");
			}
			return ret;
		},
		set:(target, prop, val) => {
			__getNodeExtendData(val).__allRefsDeletionValidator = deletionValidator;
			target[prop] = val;
			let count = refsCounter[prop] || 0;
			refsCounter[prop] = count + 1;
			return true;
		}
	});
}

Scene.EDITOR_icon = 'tree/scene';

const faderProperty = {
	name: 'faderType',
	type: String
};

Object.defineProperty(faderProperty, 'select', {
	get:() => {
		let ret = [{name:'default', value:''}];
		let a = Lib._getAllPrefabs();
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