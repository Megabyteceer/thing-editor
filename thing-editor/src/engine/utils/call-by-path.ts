import type { Container } from 'pixi.js';
import assert from 'thing-editor/src/engine/debug/assert';
import game from '../game';
import { pathDebugging_thing_editor_debug_helper, setValueByPath } from './get-value-by-path';

const callByPath = (callbackPath: CallBackPath, this_: Container): any => {
	assert(this_, '\'this\' argument is not provided in to \'callByPath\'.', 10026);
	assert(callbackPath, 'Empty callByPath string.', 10027);

	let data = stringToCallData(callbackPath);
	let path = data.p;
	let c: any;
	let rootName: string = path[0] as string;
	/// #if EDITOR
	pathDebugging_thing_editor_debug_helper(this_, callbackPath); // stopped at editor breakpoint
	/// #endif
	if (rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if (!(rootName in game)) {
			game.editor.ui.status.error('Unknown root element name \'' + rootName + '\' in \'' + callbackPath + '\'.', 30025, this_, game.editor.getFieldNameByValue(this_, callbackPath));
			return;
		}
		/// #endif
		c = (game as KeyedObject)[rootName];
	}
	let i = 1;
	let fOwner;
	while (i < path.length) {
		let n = path[i];
		fOwner = c;
		if (typeof n === 'string') {
			//assert(n.indexOf(',') < 0, "Comma ',' character detected in field name in callback`s path: " + callbackPath + '". Use "`" character to separate callback\s parameter block.', 10025); /// 99999 remove error docs 10025
			c = c[n];
		} else {
			c = c.getChildByName(n.c
				/// #if EDITOR
				, this_
				/// #endif
			);
		}

		assert(c, 'Can\'t find ' + ((typeof n === 'string') ? 'property \'' + n : 'child \'#' + n.c) + '\' in callback`s path: ' + callbackPath, 10025);

		i++;
	}
	if (data.hasOwnProperty('v')) {
		if (c === setValueByPath) {
			return setValueByPath(data.v![0], data.v![1], this_);
		}
		return c.apply(fOwner, data.v);
	} else {
		return c.call(fOwner);
	}
};

const _callsCache: KeyedMap<CallBackParsedData> = {};

const stringToCallData = (s: string): CallBackParsedData => {
	if (_callsCache.hasOwnProperty(s)) {
		return _callsCache[s];
	}
	let a = s.split(',');
	let data: CallBackParsedData = {
		p: a.shift()!.split('.').map(pathPartsMapper),
	};

	if (a.length) {
		data.v = a.map(turnInToNumberIfNumeric);
	}
	_callsCache[s] = data;
	return data;
};

const turnInToNumberIfNumeric = (s: string) => {
	let ret = parseFloat(s);
	if (!isNaN(ret)) {
		return ret;
	}

	ret = parseInt(s);
	if (!isNaN(ret)) {
		return ret;
	}
	if (s === 'true') {
		return true;
	} else if (s === 'false') {
		return false;
	}
	return s;
};

const pathPartsMapper = (s: string) => {
	if (s.charCodeAt(0) === 35) { //'#'
		return { c: s.substring(1) }; // - child name started with '#'
	}
	return s;
};

export default callByPath;
export { stringToCallData };
