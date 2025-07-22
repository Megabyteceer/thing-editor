import assert from 'thing-editor/src/engine/debug/assert.js';
import game from '../game.js';

import { Container } from 'pixi.js';
import type { ComponentChild } from 'preact';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags.js';
import { stringToCallData } from './call-by-path.js';
/// #if EDITOR
import R from '../basic-preact-fabrics';
let latestDetectedSceneNode: Container | null;
let latestMethodOwner: any;
/// #endif
const getValueByPath = (valuePath: ValuePath, this_: any
	/// #if EDITOR
	, isLatestNodeGetting = false
	/// #endif
) => {
	assert(this_, '\'this\' argument is not provided in to \'getValueByPath\'', 10028);
	assert(valuePath, 'Empty data source path string.', 10029);
	let data = stringToCallData(valuePath);
	let path = data.p;
	let c: any;
	let rootName: string = path[0] as string;
	/// #if EDITOR
	if (!isLatestNodeGetting) {
		pathDebugging_thing_editor_debug_helper(this_, valuePath); // stopped at editor breakpoint
	}
	/// #endif
	if (rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if (!isLatestNodeGetting && !(rootName in game)) {
			game.editor.ui.status.error('Unknown root element name \'' + rootName + '\' in \'' + valuePath + '\'.', 30025, this_, game.editor.getFieldNameByValue(this_, valuePath));
			return;
		}
		/// #endif
		c = (game as KeyedMap<any>)[rootName];
	}
	let i = 1;
	let fOwner;

	/// #if EDITOR
	if (!c && isLatestNodeGetting) {
		return c;
	}
	/// #endif

	while (i < path.length) {
		/// #if EDITOR
		if (c instanceof Container) {
			latestDetectedSceneNode = c;
		}
		/// #endif
		let n = path[i];
		fOwner = c;
		if (typeof n === 'string') {
			c = c[n];
		} else {
			/// #if EDITOR
			if (!(c instanceof Container)) {
				game.editor.ui.status.error('Path contains all.#name but all.name without "#" character expected.', 99999, this_);
				return 'Path syntax error: all.#';
			};
			if (!c.getChildByName) {
				return 'getChildByName for not a Container.';
			}
			/// #endif
			c = c.getChildByName(n.c);
		}
		if (!c) {
			return c;
		}
		/// #if EDITOR
		if (c instanceof Container) {
			latestDetectedSceneNode = c;
		}
		/// #endif
		i++;
	}

	/// #if EDITOR
	if (isLatestNodeGetting) {
		latestMethodOwner = fOwner;
		return c;
	}
	/// #endif

	if (typeof c === 'function') {
		return c.apply(fOwner, data.v);
	}
	return c;
};

const setValueByPath = (valuePath: string, val: any, this_: any) => {
	assert(this_, '\'this\' object is not provided in to \'setValueByPath\'', 10030);
	assert(valuePath, 'Empty setValueByPath string.', 10031);
	let path = stringToCallData(valuePath).p;
	let c;
	let rootName: string = path[0] as string;
	/// #if EDITOR
	pathDebugging_thing_editor_debug_helper(this_, valuePath); // stopped at editor breakpoint
	/// #endif
	if (rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if (!(rootName in game)) {
			game.editor.ui.status.error('Unknown root element name \'' + rootName + '\' in \'' + valuePath + '\'.', 32015, this_, game.editor.getFieldNameByValue(this_, valuePath));
			return;
		}
		/// #endif
		c = (game as KeyedMap<any>)[rootName];
	}

	let i = 1;
	while (i < path.length - 1) {
		let n = path[i];
		if (typeof n === 'string') {
			c = c[n];
		} else {
			/// #if EDITOR
			if (!c.getChildByName) {
				return 'getChildByName for not a Container.';
			}
			/// #endif
			c = c.getChildByName(n.c);
		}
		if (!c) {
			return;
		}
		i++;
	}
	let n = path[i] as string;
	if (c[n] !== val) {
		assert(typeof c[n] !== 'function', 'Attempt to override function in setValueByPath', 10069);
		c[n] = val;
	}
};

/// #if EDITOR
setValueByPath.___EDITOR_isGoodForCallbackChooser = true;

const getLatestSceneNodeBypath = (path: string, _this: any, suspendWarning = false): Container | null => {
	latestDetectedSceneNode = null;
	EDITOR_FLAGS.rememberTryTime();
	try {
		getValueByPath(path, _this, true);
	} catch (er) {
		if (!suspendWarning) {
			console.warn('path validation exception: (' + path + '): ' + _this.___info + ' ' + ((typeof er) === 'object' ? (er as any).message : er));
		}
	}
	EDITOR_FLAGS.checkTryTime();
	return latestDetectedSceneNode;
};

const getLatestSceneNodesByComplexPath = (path: string, o: Container) => {
	assert(!EDITOR_FLAGS.pathValidationCurrentThis, 'EDITOR_FLAGS.pathValidationCurrentThis is not empty.');
	EDITOR_FLAGS.pathValidationCurrentThis = o;
	let ret = [];
	let pathsParts = path.split(/[,|`]/);
	for (let p of pathsParts) {
		if (!p) {
			ret.push(null);
		} else {
			ret.push(getLatestSceneNodeBypath(p, o));
		}
	}
	if (EDITOR_FLAGS.pathValidationCurrentThis === o) {
		EDITOR_FLAGS.pathValidationCurrentThis = null;
	}
	return ret;
};

const ACTION_ICON_DEFAULT = R.img({ src: '/thing-editor/img/timeline/default.png' });

type SelectablePropertyKeys = keyof SelectableProperty;

export const findMethodDecorator = (decoratorName:SelectablePropertyKeys, owner: any, func: Function) => {
	const methodName = func.name;
	let f = func;
	while (typeof f === 'function') {
		if (decoratorName in f) {
			const ret = (f as SelectableProperty)[decoratorName];
			if (f !== func) {
				(func as SelectableProperty)[decoratorName] = ret;
			}
			return ret;
		}
		f = undefined!;
		while (owner && !f) {
			owner = Object.getPrototypeOf(owner);
			if (owner) {
				f = owner[methodName];
			}
		}
	}
};

export const getCallbackIcon = (path: string, _this: any, suspendWarning = false): ComponentChild | undefined => {
	if (!path) {
		return ACTION_ICON_DEFAULT;
	}
	EDITOR_FLAGS.rememberTryTime();
	let ret:ComponentChild;
	try {
		latestMethodOwner = null;
		let func = getValueByPath(path, _this, true);

		if (typeof func === 'function') {
			ret = findMethodDecorator('___EDITOR_actionIcon', latestMethodOwner, func);
		}
	} catch (er) {
		if (!suspendWarning) {
			console.warn('timeline icon search error: (' + path + '): ' + _this.___info + ' ' + ((typeof er) === 'object' ? (er as any).message : er));
		}
	}
	EDITOR_FLAGS.checkTryTime();
	return ret || ACTION_ICON_DEFAULT;
};

const pathDebugging_thing_editor_debug_helper = (o: Container, path: string) => {
	if (o instanceof Container) {
		if (o.__nodeExtendData.hasOwnProperty('__pathBreakpoint') && o.__nodeExtendData.__pathBreakpoint === path) {
			delete o.__nodeExtendData.__pathBreakpoint;
			debugger;
		}
	}
};


setValueByPath.___EDITOR_callbackParameterChooserFunction = () => {
	return new Promise((resolve) => {
		game.editor.ui.modal.showPrompt('Enter data path', '').then((enteredText1) => {
			if (enteredText1) {
				game.editor.ui.modal.showPrompt('Enter value', '').then((enteredText2) => {
					resolve([enteredText1, enteredText2]);
				});
			}
		});
	});
};

export {
	getLatestSceneNodeBypath,
	getLatestSceneNodesByComplexPath,
	pathDebugging_thing_editor_debug_helper
};

/// #endif

export default getValueByPath;

export {
	setValueByPath
};

