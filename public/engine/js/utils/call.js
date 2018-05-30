const call = (s, this_) => {
	assert(this_, "'this' object is not provided.");
	assert(s, "Empty call string.");
	//try {
		var data = stringToCallData(s);
		var path = data.p;
		var c;
		var rootName = path[0];
		switch (rootName) {
			case "this":
				c = this_;
				break;
			case "game":
				c = window.game;
				break;
			default:
				assert(Lib.classes.hasOwnProperty(rootName), "Can't recognize root element '" + rootName+ "' in '" + s + "'. game, this, or game-object or scene class name expected.");
				
				c = Lib.getClass(rootName);
		}
		var i = 1;
		var fOwner;
		while (i < path.length) {
			var n = path[i];
			fOwner = c;
			if(typeof n === 'string') {
				c = c[n];
			} else {
				c = c.getChildByName(n.s);
			}
/// #if EDITOR
			
			if(!c){
				assert(false, "Can't find property '" + ((typeof n === 'string') ? n : ('#' + n.s)) + "' in callback " + s);
			}
			
/// #endif
			
			i++;
		}
		if(data.hasOwnProperty('v')) {
			return c.apply(fOwner, data.v);
		} else {
			return c.call(fOwner);
		}
	/*} catch (er) {
		let m = er.message || er;
		console.error(er);
		assert(false, 'Call execution error: ' + m, true);
	}*/
}

const _callsCahce = {};

const stringToCallData = (s) => {
	if(_callsCahce.hasOwnProperty(s)) {
		return _callsCahce[s];
	}
	let data = {};
	
	let a = s.split('`');
	data.p = a[0].split('.').map(pathPartsMapper);
	if(a.length > 1) {
		data.v = a[1].split(',');
	}
	_callsCahce[s] = data;
	return data;
}

const pathPartsMapper = (s) => {
	if(s.charCodeAt(0) === 35) {//'#'
		return {s:s.substr(1)}; // - child name
	}
	return s;
}

export default call;