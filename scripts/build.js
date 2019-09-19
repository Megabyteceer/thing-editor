
const path = require("path");
/*global __dirname */
/*global require */
/*global process */


let projectPath = process.argv[2];
projectPath = path.join(__dirname, '../../', projectPath);
process.chdir(projectPath);
let isDebug = process.argv.indexOf('debug') >= 0;
let confPath = path.join(projectPath, isDebug ? 'config/webpack.debug.js' : 'config/webpack.prod.js');
let projectConfig = require(confPath);

const webpack = require("webpack");
webpack(projectConfig, (err, stats) => {

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
