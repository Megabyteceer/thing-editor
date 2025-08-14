
import type { Filter, Point } from 'pixi.js';
import { Container, DisplayObject } from 'pixi.js';
import { _editableEmbed } from 'thing-editor/src/editor/props-editor/editable.js';
import LabelsLogger from 'thing-editor/src/editor/ui/labels-logger';

import DataPathFixer from 'thing-editor/src/editor/utils/data-path-fixer';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags.js';
import { decorateGotoLabelMethods } from 'thing-editor/src/editor/utils/goto-label-consumer';
import roundUpPoint from 'thing-editor/src/editor/utils/round-up-point';
/// #if EDITOR
import R from 'thing-editor/src/engine/basic-preact-fabrics';
/// #endif
import fs, { AssetType } from 'thing-editor/src/editor/fs';
import { PREFAB_PIVOT } from 'thing-editor/src/editor/ui/viewport';
import assert from 'thing-editor/src/engine/debug/assert.js';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import ___Guide from 'thing-editor/src/engine/lib/assets/src/___system/guide.c';
import Scene from './scene.c';

/** returns object rotation relative to it`s scene */
Container.prototype.getGlobalRotation = function getGlobalRotation() {
	let ret = this.rotation;
	let p = this.parent;
	while (p && p !== game.stage) {
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
	while (p && (p.parent !== game.stage) && p.parent) {
		p = p.parent;
	}
	return p;
};

Container.prototype.detachFromParent = function detachFromParent() {
	if (this.parent) {
		this.parent.removeChild(this);
	}
};

Container.prototype.init = function init() {
	/// #if EDITOR
	EDITOR_FLAGS._root_initCalled.delete(this);
	/// #endif
};

Container.prototype.onRemove = function onRemove() {
	/// #if EDITOR
	EDITOR_FLAGS._root_onRemovedCalled.delete(this);
	assert(!game.__EDITOR_mode || EDITOR_FLAGS.isStoppingTime, '\'onRemove()\' called in edition mode');
	/// #endif
};

Container.prototype.remove = function remove() {
	Lib.destroyObjectAndChildren(this, true);
};

/// #if EDITOR
const ACTION_ICON_REMOVE = R.img({ src: '/thing-editor/img/timeline/remove.png' });
(Container.prototype.remove as SelectableProperty).___EDITOR_actionIcon = ACTION_ICON_REMOVE;
/// #endif

Container.prototype.removeWithoutHolder = function remove() {
	Lib.destroyObjectAndChildren(this);
};

Container.prototype.findParentByType = function (classType) {
	assert(classType.prototype instanceof Container, 'Container inherited class expected.', 10053);
	let p = this.parent;
	while (p && !(p instanceof classType)) {
		p = p.parent;
	}
	return p;
};

Container.prototype.findParentByName = function (name) {
	let p = this.parent;
	while (p && p.name !== name) {
		p = p.parent;
	}
	return p;
};

Container.prototype.addFilter = function addFilter(f) {
	if (!this.filters) {
		this.filters = [f];
	} else {
		this.filters.push(f);
	}
};

Container.prototype.removeFilter = function removeFilter(this: Container, f) {
	let i = (this.filters as Filter[])?.indexOf(f);
	if (i >= 0) {
		(this.filters as Filter[]).splice(i, 1);
	}
};

/// #if EDITOR

(Container.prototype.remove as SelectableProperty).___EDITOR_isGoodForChooser = true;

Container.prototype.__onSelect = function __onSelect() {
	let p = this.parent;
	while (p !== game.stage) {
		if (p.__onChildSelected) {
			p.__onChildSelected();
		}
		p = p.parent;
	}
};

/// #endif


Container.prototype.update = function update() {
	for (let c of this.children) {
		c.update();
	}
};

let _findChildName = '';
let _findChildRet: Container | undefined;
const _findChildInner = (o: Container) => {
	if (o.name === _findChildName) {
		assert(!_findChildRet, 'More that one element with name "' + _findChildName + '" exists.', 10006);
		_findChildRet = o;
	}
};

Container.prototype.findChildByName = function findChildByName(name: string): Container | undefined {
	assert(name, 'Empty name received.', 10005);
	_findChildName = name;
	_findChildRet = undefined;
	this.forAllChildren(_findChildInner);
	return _findChildRet;
};

let findByTypeRet: Container[];
let findByTypeClass: SourceMappedConstructor;

const _findByTypeInner = (o: Container) => {
	if (o instanceof findByTypeClass) {
		findByTypeRet.push(o);
	}
};

/// #if DEBUG

Container.prototype.getChildByName = function (this: Container, name: string, debugThis: Container) {
	let ret;
	for (let c of this.children) {
		if (c.name === name) {
			if (ret) {
				let errorTxt = 'getChildByName called, but more that one object with name \'' + name + '\' present in container ' + this.___info;
				/// #if EDITOR
				game.editor.ui.status.error(errorTxt, 10052, debugThis || ret);
				/*
				/// #endif
				alert(errorTxt);
				//*/
				return null;
			}
			ret = c;
		}
	}
	return ret;
} as any;

/// #endif

Container.prototype.findChildrenByType = function <T extends Container>(classType: new () => T): T[] {
	assert(classType.prototype instanceof DisplayObject, 'Container inherited class expected.', 10053);
	findByTypeClass = classType as unknown as SourceMappedConstructor;
	findByTypeRet = [];
	this.forAllChildren(_findByTypeInner);
	return findByTypeRet as T[];
};

let findByNameName: string;

const _findByNameInner = (o: Container) => {
	if (o.name === findByNameName) {
		findByTypeRet.push(o);
	}
};

Container.prototype.findChildrenByName = function (name) {
	assert(name, 'Name expected', 10054);
	findByNameName = name;
	findByTypeRet = [];
	this.forAllChildren(_findByNameInner);
	return findByTypeRet;
};

assert(!Container.prototype.forAllChildren, 'forAllChildren method needs renaming, because of PIXI changes.');

Container.prototype.forAllChildren = function (callback) {
	for (let o of this.children) {
		callback(o);
		o.forAllChildren(callback);
	}
};


Object.defineProperty(Container.prototype, 'isCanBePressed', {
	get: function () {
		if (!this.interactive || game.disableAllButtons) return false;
		let p = this.parent;
		while (p !== game.stage && p.interactiveChildren && p.visible) {
			p = p.parent;
			if (!p) {
				return false;
			}
		}
		return p.interactiveChildren && p.visible;
	},
	enumerable: true
});


Object.defineProperties(Container.prototype, {
	'scale.x': {
		get: function () {
			return this.transform.scale.x;
		},
		set: function (val: number) {
			this.transform.scale.x = val;
		}, configurable: true
	}, 'scale.y': {
		get: function () {
			return this.transform.scale.y;
		},
		set: function (val: number) {
			this.transform.scale.y = val;
		}, configurable: true
	},
	'skew.x': {
		get: function () {
			return this.transform.skew.x;
		},
		set: function (val: number) {
			this.transform.skew.x = val;
		}, configurable: true
	}, 'skew.y': {
		get: function () {
			return this.transform.skew.y;
		},
		set: function (val: number) {
			this.transform.skew.y = val;
		}, configurable: true
	},
	'pivot.x': {
		get: function () {
			return this.transform.pivot.x;
		},
		set: function (val: number) {
			this.transform.pivot.x = val;
		}, configurable: true
	}, 'pivot.y': {
		get: function () {
			return this.transform.pivot.y;
		},
		set: function (val: number) {
			this.transform.pivot.y = val;
		}, configurable: true
	}
});


export default Container;

/// #if EDITOR

Object.defineProperties(Container.prototype, {
	'worldAlpha': {
		get: function (this: Container): number {
			return ((this.__hideInEditor || this.__nodeExtendData?.isolate) && game.__EDITOR_mode) ? 0 : (this as any)._worldAlpha;
		},
		set: function (v: number) {
			this._worldAlpha = v;
		}
	}
});


Object.defineProperties(Container.prototype, {
	'___info': {
		get: function () {
			let ret = getObjectInfo(this);
			let p = this.parent;
			while (p && (p !== game.stage)) {
				ret += ' > ' + getObjectInfo(p);
				p = p.parent;
			}
			return ret;
		}
	}
});

const FILTERED_PROPS = new Set([
	'zIndex',
	'transform',
	'tabIndex',
	'sortableChildren',
	'sortDirty',
	'skew',
	'scale',
	'renderable',
	'renderId',
	'position',
	'pivot',
	'localTransform',
	'isSprite',
	'isMask',
	'getLocalBounds',
	'eventMode',
	'destroyed',
	'cacheAsBitmap',
	'cullable',
	'accessibleType',
	'accessiblePointerEvents',
	'_tempDisplayObjectParent',
	'accessible',
	'accessibleChildren'
]);

Container.prototype.__EDITOR_filterPropsSelection = (propertyName:string): boolean => {
	return FILTERED_PROPS.has(propertyName);
};

Container.__EDITOR_filterPropsSelection = (propertyName:string): boolean => {
	return propertyName === 'defaultSortableChildren';
};

Container.prototype.__isAnyChildSelected = function __isAnyChildSelected(): boolean {
	for (let o of game.editor.selection) {
		while (o) {
			if (o === this) {
				return true;
			}
			o = o.parent;
		}
	}
	return false;
};

(Container.prototype.destroy as SelectableProperty).___EDITOR_isHiddenForChooser = true;
Container.__EDITOR_icon = 'tree/container';

const getObjectInfo = (o: Container) => {
	return ('[' + (o.constructor as SourceMappedConstructor).__className + ':' + o.name + ']');
};

const preventOverridingPop = {
	type: 'boolean',
	visible: (o:Container) => o === game.currentContainer,
	disabled: (o:Container) => o.__preventOverriding,
	beforeEdited: (val:boolean) => {
		if (val) {
			if (game.editor.selection.some((o) =>{
				const isScene = o instanceof Scene;
				const asset = fs.getFileByAssetName(o.name!, isScene ? AssetType.SCENE : AssetType.PREFAB);
				if (!asset.lib) {
					return true;
				}
			})) {
				return 'asset should be located in a library.';
			}
		}
	}
} as EditablePropertyDescRaw<Container>;

_editableEmbed(Container, '__root-splitter', { type: 'splitter', title: 'Basic props' });
_editableEmbed(Container, 'name', {
	type: 'string',
	parser: (name: string): string => {
		return name && name.replace('.', '_').replace('#', '_').replace('`', '_').replace(',', '_');
	},
	disabled: (node: Container) => {
		if (node.parent === game.stage) {
			return 'root object`s name can not be edited because it is always equal to scene`s or prefab`s name.';
		}
	},
	beforeEdited: (val: string) => {
		DataPathFixer.beforeNameEdit(val);
	},
	onBlur: () => {
		DataPathFixer.onNameBlur();
	}
});
_editableEmbed(Container, 'x', { animate: true });
_editableEmbed(Container, 'y', { animate: true });
_editableEmbed(Container, 'rotation', {
	step: 0.001, animate: true,
	afterEdited: () => {
		game.editor.selection.forEach((c, i) => {
			if (game.keys.shiftKey) {
				const prevRotation = c.rotation;
				const eatenRotation = (c.__nodeExtendData.eatenRotation || 0);
				c.rotation = Math.round((c.rotation + eatenRotation) / Math.PI * 8) * Math.PI / 8;
				c.__nodeExtendData.eatenRotation = eatenRotation + prevRotation - c.rotation;
			}
			___Guide.show(0, 0, 0, 'rotation' + i, c);
		});
	}
});
_editableEmbed(Container, 'alpha', {
	animate: true,
	step: 0.01,
	min: 0,
	max: 1
});
_editableEmbed(Container, 'visible', { animate: true });
_editableEmbed(Container, 'interactive');

_editableEmbed(Container, 'splitter-helpers', { type: 'splitter', title: 'Helpers' });

_editableEmbed(Container, 'angle', {
	notSerializable: true,
	afterEdited: () => {
		for (const o of game.editor.selection) {
			game.editor.onObjectsPropertyChanged(o, 'rotation', o.rotation);

		}
	}
});

_editableEmbed(Container, '__hideInEditor', { type: 'boolean', tip: 'hide object in viewport during editor mode' });
_editableEmbed(Container, '__doNotSelectByClick', { type: 'boolean', tip: 'prevent object to be selected by viewport click' });
_editableEmbed(Container, '__description', { type: 'string', multiline: true });
_editableEmbed(Container, '__prefabPivot', { type: 'string', disabled: () => true, default: PREFAB_PIVOT.MIDDLE, visible: (o) => {
	return !(o instanceof Scene) && o === game.currentContainer;
} });
_editableEmbed(Container, '__hideChildren', { type: 'boolean', tip: 'hide children in tree' });
_editableEmbed(Container, '__preventOverriding', preventOverridingPop);
_editableEmbed(Container, '___id', {
	type: 'number',
	noNullCheck: true,
	disabled: () => {
		return true;
	}
});

const alignX = () => { ///99999
	let firstObject = game.editor.selection[0];
	let p = firstObject.getRootContainer().toLocal(firstObject, firstObject.parent);
	for (let i = 1; i < game.editor.selection.length; i++) {
		let o = game.editor.selection[i];
		game.editor.onObjectsPropertyChanged(o, 'x', roundUpPoint(o.parent.toLocal(p, firstObject.getRootContainer())).x);
	}
};
_editableEmbed(Container, 'splitter-transform', { type: 'btn', name: 'Align X ↔', onClick: alignX });
const alignY = () => { ///99999
	let firstObject = game.editor.selection[0];
	let p = firstObject.getRootContainer().toLocal(firstObject, firstObject.parent);
	for (let i = 1; i < game.editor.selection.length; i++) {
		let o = game.editor.selection[i];
		game.editor.onObjectsPropertyChanged(o, 'y', roundUpPoint(o.parent.toLocal(p, firstObject.getRootContainer())).y);
	}
};
_editableEmbed(Container, 'splitter-transform', { type: 'btn', name: 'Align Y ↕', onClick: alignY });

_editableEmbed(Container, 'splitter-transform', { type: 'splitter', title: 'Transform' });
_editableEmbed(Container, 'scale.x', { step: 0.01, default: 1, animate: true });
_editableEmbed(Container, 'scale.y', { step: 0.01, default: 1, animate: true });
_editableEmbed(Container, 'skew.x', { step: 0.01, animate: true });
_editableEmbed(Container, 'skew.y', { step: 0.01, animate: true });
_editableEmbed(Container, 'pivot.x', { animate: true });
_editableEmbed(Container, 'pivot.y', { animate: true });
/// #endif


/// #if EDITOR
let goToLabelRecursionLevel = 0; // eslint-disable-line @typescript-eslint/no-unused-vars
/// #endif

Container.prototype.gotoLabelRecursive = function (labelName) {
	/// #if EDITOR
	if (!goToLabelRecursionLevel) {
		LabelsLogger.logGotoLabelRecursive(labelName, this);
	}
	goToLabelRecursionLevel++;
	/// #endif
	for (let c of this.children) {
		c.gotoLabelRecursive(labelName);
	}
	/// #if EDITOR
	goToLabelRecursionLevel--;
	/// #endif
};

/// #if EDITOR
decorateGotoLabelMethods(Container as any);
/// #endif
