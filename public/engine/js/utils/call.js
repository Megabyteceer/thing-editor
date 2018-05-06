const call = (s, this_) => {
	assert(s, "Empty call string.");
	try {
		var data = stringToCallData(s);
		var path = data.path;
		var c;
		var rootName = path[0].s;
		switch (rootName) {
			case "this":
				c = this_;
				break;
			case "game":
				c = window.game;
				break;
			default:
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
				c = c.getChildrenByName(n.s);
			}
			i++;
		}
		if(data.hasOwnProperty('v')) {
			return c.call(fOwner, data.v);
		} else {
			return c();
		}
	} catch (er) {
		let m = er.message || er;
		console.error(er);
		assert(false, 'Call execution error: ' + m, true);
	}
}

const _callsCahce = {};

const stringToCallData = (s) => {
	if(_callsCahce.hasOwnProperty(s)) {
		return _callsCahce[s];
	}
	let data = {};
	
	let a = s.split('~');
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