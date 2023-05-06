/// <reference path="../../editor/env.d.ts" />

import { _editableEmbed } from "thing-editor/src/editor/props-editor/editable.js";
import { Container, Filter, Point } from "pixi.js";

import Lib from "../lib.js";
import game from "../game.js";
import EDITOR_FLAGS from "thing-editor/src/editor/utils/flags.js";
import assert from "thing-editor/src/engine/debug/assert.js";
import { SelectableProperty, SourceMappedConstructor } from "thing-editor/src/editor/env.js";


/** returns object rotation relative to it`s scene */
Container.prototype.getGlobalRotation = function getGlobalRotation() {
	let ret = this.rotation;
	let p = this.parent;
	while(p && p !== game.stage) {
		ret += p.rotation;
		p = p.parent;
	}
	return ret;
};

Container.prototype.getScenePosition = function getScenePosition(resultPoint: Point, skipUpdate = false) {
	return game.stage.toLocal(this, this.parent, resultPoint, skipUpdate);
};

Container.prototype.getRootContainer = function getRootContainer() {
	let p = this;
	while(p && (p.parent !== game.stage) && p.parent) {
		p = p.parent;
	}
	return p;
};

Container.prototype.detachFromParent = function detachFromParent() {
	if(this.parent) {
		this.parent.removeChild(this);
	}
};

Container.prototype.init = () => {
	/// #if EDITOR
	EDITOR_FLAGS._root_initCalled = true;
	/// #endif
};

Container.prototype.onRemove = () => {
	/// #if EDITOR
	EDITOR_FLAGS._root_onRemovedCalled = true;
	/// #endif
};

Container.prototype.remove = function remove() {
	Lib.destroyObjectAndChildren(this, true);
};

Container.prototype.removeWithoutHolder = function remove() {
	Lib.destroyObjectAndChildren(this);
};

Container.prototype.findParentByType = function (classType) {
	assert(classType.prototype instanceof Container, "Container inherited class expected.", 10053);
	let p = this.parent;
	while(p && !(p instanceof classType)) {
		p = p.parent;
	}
	return p;
};

Container.prototype.findParentByName = function (name) {
	let p = this.parent;
	while(p && p.name !== name) {
		p = p.parent;
	}
	return p;
};

Container.prototype.addFilter = function addFilter(f) {
	if(!this.filters) {
		this.filters = [f];
	} else {
		this.filters.push(f);
	}
};

Container.prototype.removeFilter = function removeFilter(this: Container, f) {
	let i = (this.filters as Filter[]).indexOf(f);
	if(i >= 0) {
		(this.filters as Filter[]).splice(i, 1);
	}
};

/// #if EDITOR

(Container.prototype.remove as SelectableProperty).___EDITOR_isGoodForChooser = true;

Container.prototype.__onSelect = function __onSelect() {
	let p = this.parent;
	while(p !== game.stage) {
		if(p.__onChildSelected) {
			p.__onChildSelected();
		}
		p = p.parent;
	}
};


Container.prototype.update = function update() {
	for(let c of this.children) {
		c.update();
	}
};

let _findChildName = '';
let _findChildRet: Container | null;
const _findChildInner = (o: Container) => {
	if(o.name === _findChildName) {
		assert(!_findChildRet, 'More that one element with name "' + _findChildName + '" exists.', 10006);
		_findChildRet = o;
	}
};

Container.prototype.findChildByName = function findChildByName(name: string): Container | null {
	assert(name, 'Empty name received.', 10005);
	_findChildName = name;
	_findChildRet = null;
	this.forAllChildren(_findChildInner);
	return _findChildRet;
};

let findByTypeRet: Container[];
let findByTypeClass: SourceMappedConstructor;

const _findByTypeInner = (o: Container) => {
	if(o instanceof findByTypeClass) {
		findByTypeRet.push(o);
	}
};

/// #if DEBUG

Container.prototype.getChildByName = function (name, debugThis) {
	let ret;
	for(let c of this.children) {
		if(c.name === name) {
			if(ret) {
				let errorTxt = "getChildByName called, but more that one object with name '" + name + "' present in container " + this.___info;
				/// #if EDITOR
				game.editor.logError(errorTxt, 10052, debugThis || ret);
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

Container.prototype.findChildrenByType = function <T extends Container>(classType: new () => T): T[] {
	assert(classType.prototype instanceof Container, "Container inherited class expected.", 10053);
	findByTypeClass = classType as unknown as SourceMappedConstructor;
	findByTypeRet = [];
	this.forAllChildren(_findByTypeInner);
	return findByTypeRet as T[];
};

let findByNameName: string;

const _findByNameInner = (o: Container) => {
	if(o.name === findByNameName) {
		findByTypeRet.push(o);
	}
};

Container.prototype.findChildrenByName = function (name) {
	assert(name, "Name expected", 10054);
	findByNameName = name;
	findByTypeRet = [];
	this.forAllChildren(_findByNameInner);
	return findByTypeRet;
};

assert(!Container.prototype.forAllChildren, "forAllChildren method needs renaming, because of PIXI changes.");

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

/// #if EDITOR

Container.prototype.__isAnyChildSelected = function __isAnyChildSelected(): boolean {
	for(let o of game.editor.selection) {
		while(o) {
			if(o === this) {
				return true;
			}
			o = o.parent;
		}
	}
	return false;
};

(Container.prototype.destroy as SelectableProperty).___EDITOR_isHiddenForChooser = true;
(Container as any as SourceMappedConstructor).__EDITOR_icon = 'tree/container';
(Container as any as SourceMappedConstructor).__EDITOR_group = 'Basic';
/// #endif


_editableEmbed(Container, 'basic', { type: 'splitter', title: 'Basic props:', });
_editableEmbed(Container, 'name', {
	type: 'string',
	parser: (name: string): string => {
		return name && name.replace('.', '_').replace('#', '_').replace('`', '_').replace(',', '_');
	},
	disabled: (node: Container) => {
		return node.parent === game.stage;
	},
	beforeEdited: (_val: string) => {
		//TODO: game.editor.DataPathFixer.beforeNameEdit(val);
	},
	onBlur: (_val: string) => {
		//TODO: game.editor.DataPathFixer.onNameBlur();
	},
	notAnimate: true

});
_editableEmbed(Container, 'x');
_editableEmbed(Container, 'y');
_editableEmbed(Container, 'rotation', { step: 0.001 });


/*
	{
		name: 'alpha',
		type: Number,
		step: 0.01,
		min: 0,
		max: 1,
		default: 1
	},
	{
		name: 'visible',
		type: Boolean,
		default: true
	},
	{
		name: 'interactive',
		type: Boolean,
		default: false
	},
	{
		type: 'splitter',
		title: 'Helpers:',
		name: 'helpers'
	},
	{
		name: '__lockSelection',
		type: Boolean,
		default: false
	},
	{
		name: '__description',
		type: String,
		multiline: true
	},
	{
		name: '__hideChildren',
		type: Boolean,
		default: false
	},
	{
		name: '___id',
		type: Number,
		notSerializable: true,
		noNullCheck: true,
		disabled: () => {
			return true;
		}
	},
	{
		type: 'splitter',
		title: 'Transform:',
		name: 'transform'
	},
	{
		name: 'scale.x',
		type: Number,
		step: 0.01,
		default: 1
	},
	{
		name: 'scale.y',
		type: Number,
		step: 0.01,
		default: 1
	},
	{
		name: 'skew.x',
		type: Number,
		step: 0.01
	},
	{
		name: 'skew.y',
		type: Number,
		step: 0.01
	},
	{
		name: 'pivot.x',
		type: Number
	},
	{
		name: 'pivot.y',
		type: Number
	}
]);



const getObjectName = (o: Container) => {
	return (o.name || ('(' + (o.constructor as SourceMappedConstructor).__className + ')'));
};

Object.defineProperties(Container.prototype, {
	'___info': {
		get: function () {
			let ret = getObjectName(this);
			let p = this.parent;
			while(p && (p !== game.stage)) {
				ret += ' > ' + getObjectName(p);
				p = p.parent;
			}
			return ret;
		}
	}, 'scale.x': {
		get: function () {
			return this.transform.scale.x;
		},
		set: function (val) {
			this.transform.scale.x = val;
		}, configurable: true
	}, 'scale.y': {
		get: function () {
			return this.transform.scale.y;
		},
		set: function (val) {
			this.transform.scale.y = val;
		}, configurable: true
	},
	'skew.x': {
		get: function () {
			return this.transform.skew.x;
		},
		set: function (val) {
			this.transform.skew.x = val;
		}, configurable: true
	}, 'skew.y': {
		get: function () {
			return this.transform.skew.y;
		},
		set: function (val) {
			this.transform.skew.y = val;
		}, configurable: true
	},
	'pivot.x': {
		get: function () {
			return this.transform.pivot.x;
		},
		set: function (val) {
			this.transform.pivot.x = val;
		}, configurable: true
	}, 'pivot.y': {
		get: function () {
			return this.transform.pivot.y;
		},
		set: function (val) {
			this.transform.pivot.y = val;
		}, configurable: true
	}
});
*/

export default Container;

