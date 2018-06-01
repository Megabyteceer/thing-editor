const assertsReplacer = /^[ \t]*assert[ \t]*\(.+/gm;
	
module.exports = function(source) {
	this.cacheable();
	
	var res = source.replace(assertsReplacer, '\n');
	
	this.callback(null, res);
};