import game from "../game.js";
import DisplayObject from "./display-object.js";

/// #if EDITOR

class Container extends PIXI.Container { // js docks hack for editor time

	/** @return {number} */
	getGlobalRotation(){return 0;};

	/** @param {Function} classType 
	 * @return {Container}*/
	findParentByType(classType){};
	
	/** @param {string} name 
	 * @return {Container}*/
	findParentByName(name){};

	/** @param {PIXI.Point} resultPoint 
	* @param {boolean} skipUpdate 
	* @return {PIXI.Point}*/
	getScenePosition(resultPoint, skipUpdate){};

	/** @return {Container}*/
	getRootContainer(){};

	/** call in only in your own init methods as super.init(); */
	init(){};

	/** remove object from scene */
	remove(){};
	
	addFilter(filter){};

	removeFilter(filter){};

	detachFromParent(){};

	/** @private
	 * @override
	 */
	destroy(){};

	/** @param {string} labelName */
	gotoLabelRecursive(labelName){};

	/** @return {Array<Container>} */
	get children() {
		return [];
	}
	set children(v){}

	/** @return {boolean} */
	get isCanBePressed() {};
}

Container = PIXI.Container;
/*
/// #endif
const Container = PIXI.Container;
//*/

Container.prototype.update = function update() {
	for (let c of this.children) {
		c.update();
	}
};

Container.prototype.init = () => {
	/// #if EDITOR
	editor._root_initCalled = true;
	/// #endif
};

Container.prototype.onRemove = () => {
	/// #if EDITOR
	editor._root_onRemovedCalled = true;
	/// #endif
};

/**
 * search child recursively
 * @param {string} name
 * @return {Container}
 */
Container.prototype.findChildByName = function findChildByName(name) {
	assert(name, 'Empty name received.', 10005);
	let stack = [this];
	while (stack.length > 0) {
		if (stack.length > 1000) throw new Error('overflow');
		let o = stack.pop();
		let children = o.children;
		let len = children.length;
		for (let i =  0; i < len; i++) {
			o = children[i];
			if(o.name === name) {
				/// #if DEBUG
				o.name = '';
				let double = this.findChildByName(name);
				o.name = name;
				assert(!double, 'More that one element with name "' + name + '" exists.', 10006);
				/// #endif
				return o;
			}
			if (o.children.length > 0) {
				stack.push(o);
			}
		}
	}
	return null;
};

let findByTypeRet;
let findByTypeClass;

const _findByTypeInner = (o) => {
	if(o instanceof findByTypeClass) {
		findByTypeRet.push(o);
	}
};

/// #if DEBUG
/**
 * @param {string} name
 * @return {Container}
 */
Container.prototype.getChildByName = function(name) {
	let ret;
	for(let c of this.children) {
		if(c.name === name) {
			if(ret) {
				editor.ui.status.error("getChildByName called, but more that one object with name '"+ name + "' present in container " + this.___info, 10052, ret);
				return undefined;
			}
			ret = c;
		}
	}
	return ret;
};

/// #endif
/**
 * @param {typeof Container} classType
 * @return {Array<Container>}
 */
Container.prototype.findChildrenByType = function (classType) {
	assert(classType.prototype instanceof DisplayObject, "DisplayObject inherited class expected.", 10053);
	findByTypeClass = classType;
	findByTypeRet = [];
	this.forAllChildren(_findByTypeInner);
	return findByTypeRet;
};

let findByNameName;

const _findByNameInner = (o) => {
	if(o.name === findByNameName) {
		findByTypeRet.push(o);
	}
};
/**
 * @param {string} name
 * @return {Array<Container>}
 */
Container.prototype.findChildrenByName = function (name) {
	assert(name, "Name expected", 10054);
	findByNameName = name;
	findByTypeRet = [];
	this.forAllChildren(_findByNameInner);
	return findByTypeRet;
};

assert(!Container.prototype.forAllChildren, "forAllChildren method needs renaming, because of PIXI changes.");

/**
 * @param {(o:Container)=>void} callback
 */
Container.prototype.forAllChildren = function (callback) {
	for (let o of this.children) {
		callback(o);
		o.forAllChildren(callback);
	}
};


Object.defineProperty(Container.prototype, 'isCanBePressed', {
	get:function() {
		if (!this.interactive || game.disableAllButtons) return false;
		let p = this.parent;
		while (p !== game.stage && p.interactiveChildren && p.visible) {
			p = p.parent;
		}
		return p.interactiveChildren && p.visible;
	},
	enumerable:true
});

export default Container;

/// #if EDITOR

DisplayObject.prototype.__isAnyChildSelected = function __onSelect() {
	for(let o of editor.selection) {
		while(o) {
			if(o === this) {
				return true;
			}
			o = o.parent;
		}
	}
};

Container.prototype.destroy.___EDITOR_isHiddenForChooser = true;
Container.__EDITOR_icon = 'tree/container';
Container.__EDITOR_group = 'Basic';
/// #endif