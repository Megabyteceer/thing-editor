const webpack = require("webpack");
const path = require("path");
/*global require */
/*global module */
module.exports = function(projectPath, callback, debug) {
	console.log('starting build: ' + projectPath);

	let config = require(path.resolve(projectPath, debug ? 'config/webpack.debug.js' : 'config/webpack.prod.js'));

	webpack(config, (err, stats) => {
		let result = {errors:[], warnings:[]};

		function errorHandle(err) {
			var txt = 'ERROR: '+ err;
			result.errors.push (txt);
			console.log(txt);
		}
		function warnHandle(err) {
			var txt = 'WARNING: '+ err;
			result.warnings.push (txt);
			console.log(txt);
		}
		if (err) {
			console.error(err.stack || err);
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
		callback(result);
	});
};