import { pathDebugging, setValueByPath } from "./get-value-by-path";
import game from "../game";
import type { CallBackParsedData, CallBackPath, KeyedMap, KeyedObject } from "thing-editor/src/editor/env";
import assert from "thing-editor/src/engine/debug/assert";
import { Container } from "pixi.js";

const callByPath = (callbackPath: CallBackPath, this_: Container): any => {
	assert(this_, "'this' argument is not provided in to 'callByPath'.", 10026);
	assert(callbackPath, "Empty callByPath string.", 10027);

	let data = stringToCallData(callbackPath);
	let path = data.p;
	let c: any;
	let rootName: string = path[0] as string;
	/// #if EDITOR
	pathDebugging(this_, callbackPath);
	/// #endif
	if(rootName === 'this') {
		c = this_;
	} else {
		/// #if EDITOR
		if(!(rootName in game)) {
			game.editor.logError("Unknown root element name '" + rootName + "' in '" + callbackPath + "'.", 30025, this_, game.editor.getFieldNameByValue(this_, callbackPath));
			return;
		}
		/// #endif
		c = (game as KeyedObject)[rootName];
	}
	let i = 1;
	let fOwner;
	while(i < path.length) {
		let n = path[i];
		fOwner = c;
		if(typeof n === 'string') {
			assert(n.indexOf(',') < 0, "Comma ',' character detected in field name in callback`s path: " + callbackPath + '". Use "`" character to separate callback\s parameter block.', 10025);
			/// #endif
			c = c[n];
		} else {
			c = c.getChildByName(n.s
				/// #if EDITOR
				, this_
				/// #endif
			);
		}

		assert(c, "Can't find " + ((typeof n === 'string') ? "property '" + n : "child '#" + n.s) + "' in callback`s path: " + callbackPath, 10025);

		i++;
	}
	if(data.hasOwnProperty('v')) {
		if(c === setValueByPath) {
			//@ts-ignore
			return setValueByPath(data.v[0], data.v[1], this_);
		}
		return c.apply(fOwner, data.v);
	} else {
		return c.call(fOwner);
	}
};

const _callsCache: KeyedMap<CallBackParsedData> = {};

const stringToCallData = (s: string): CallBackParsedData => {
	if(_callsCache.hasOwnProperty(s)) {
		return _callsCache[s];
	}
	let a = s.split('`');
	let data: CallBackParsedData = {
		p: a[0].split('.').map(pathPartsMapper),
	};

	if(a.length > 1) {
		data.v = a[1].split(',').map(turnInToNumberIfNumeric);
	}
	_callsCache[s] = data;
	return data;
};

const numChecker = /^\-?[\.0-9]+$/;
const turnInToNumberIfNumeric = (s: string) => {
	if(s.match(numChecker)) {
		return parseFloat(s);
	}
	return s;
};

const pathPartsMapper = (s: string) => {
	if(s.charCodeAt(0) === 35) {//'#'
		return { s: s.substring(1) }; // - child name started with '#'
	}
	return s;
};

export default callByPath;
export { stringToCallData };