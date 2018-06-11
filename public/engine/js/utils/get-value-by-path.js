const getValueByPath = (s, this_) => {
	assert(this_, "'this' object is not provided.");
	assert(s, "Empty data source path string.");
	let path = stringToPathData(s);
	let c;
	let rootName = path[0];
	switch (rootName) {
		case "this":
			c = this_;
			break;
		case "all":
			c = game.currentScene.all;
			break;
		case "game":
			c = window.game;
			break;
		default:
			assert(Lib.classes.hasOwnProperty(rootName), "Can't recognize data source path root element '" + rootName+ "' in '" + s + "'. game, this, or game-object or scene class name expected.");
			
			c = Lib.getClass(rootName);
	}
	let i = 1;
	let fOwner;
	while (i < path.length) {
		let n = path[i];
		fOwner = c;
		if(typeof n === 'string') {
			c = c[n];
		} else {
			c = c.getChildByName(n.s);
		}
		if(!c) {
			return undefined;
		}
		i++;
	}
	if(typeof c === "function") {
		return c.call(fOwner);
	}
	return c;
};

const _cahce = {};

const stringToPathData = (s) => {
	if(_cahce.hasOwnProperty(s)) {
		return _cahce[s];
	}
	let path = s.split('.').map(pathPartsMapper);
	_cahce[s] = path;
	return path;
};

const pathPartsMapper = (s) => {
	if(s.charCodeAt(0) === 35) {//'#'
		return {s:s.substr(1)}; // - child name
	}
	return s;
};

export default getValueByPath;