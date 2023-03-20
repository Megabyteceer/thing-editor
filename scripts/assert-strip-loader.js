const assertsReplacer = /^[ \t]*assert[ \t]*\(.+/gm;
const assertsImportReplacer = /^[ \t]*import[ \t]+assert[ \t]+from[ \t]+/gm;
/*global module */
/*global process */
module.exports = function (source) {
	this.cacheable();
	let res;
	if((process.argv.indexOf('debug') < 0) && !process.env.THING_ENGINE_DEBUG_BUILD) {
		res = source.replace(assertsReplacer, '\n').replace(assertsImportReplacer, '\n');
	} else {
		res = source;
	}

	this.callback(null, res);
};