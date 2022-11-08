/// <reference path="../../../index.d.ts" />

import game from "../game.js";
import DisplayObject from "./display-object.js";

const Container = PIXI.Container;

Container.prototype.update = function update() {
	for(let c of this.children) {
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

let _findChildName;
let _findChildRet;
const _findChildInner = (o) => {
	if(o.name === _findChildName) {
		assert(!_findChildRet, 'More that one element with name "' + _findChildName + '" exists.', 10006);
		_findChildRet = o;
	}
};
/**
 * search child recursively
 * @param {string} name
 * @return {PIXI.Container}
 */
Container.prototype.findChildByName = function findChildByName(name) {
	assert(name, 'Empty name received.', 10005);
	_findChildName = name;
	_findChildRet = null;
	this.forAllChildren(_findChildInner);
	return _findChildRet;
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
 * @return {PIXI.Container}
 */
Container.prototype.getChildByName = function (name, debugThis) {
	let ret;
	for(let c of this.children) {
		if(c.name === name) {
			if(ret) {
				let errorTxt = "getChildByName called, but more that one object with name '" + name + "' present in container " + this.___info;
				/// #if EDITOR
				editor.ui.status.error(errorTxt, 10052, debugThis || ret);
				/*
				/// #endif
				alert(errorTxt);
				//*/
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
 * @param {(o:PIXI.Container)=>void} callback
 */
Container.prototype.forAllChildren = function (callback) {
	for(let o of this.children) {
		callback(o);
		o.forAllChildren(callback);
	}
};


Object.defineProperty(Container.prototype, 'isCanBePressed', {
	get: function () {
		if(!this.interactive || game.disableAllButtons) return false;
		let p = this.parent;
		while(p !== game.stage && p.interactiveChildren && p.visible) {
			p = p.parent;
		}
		return p.interactiveChildren && p.visible;
	},
	enumerable: true
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