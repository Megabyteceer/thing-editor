const webpack = require("webpack");
const path = require("path");
/*global require */
/*global process */

let projectPath = process.argv[2];
let debug = process.argv.indexOf('debug') >= 0;

let config = require(path.resolve(projectPath, debug ? 'config/webpack.debug.js' : 'config/webpack.prod.js'));

webpack(config, (err, stats) => {

	function errorHandle(err) {
		var txt = 'ERROR: '+ err;
		console.error(txt);
	}
	function warnHandle(err) {
		var txt = 'WARNING: '+ err;
		console.log(txt);
	}
	if (err) {
		if (err.details) {
			err.details.some(errorHandle);
		}
	} else {

		const info = stats.toJson();

		if (stats.hasErrors()) {
			info.errors.some(errorHandle);
		}

		if (stats.hasWarnings()) {
			info.warnings.some(warnHandle);
		}
	}
});
