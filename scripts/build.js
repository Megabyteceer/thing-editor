
const path = require("path");
const fs = require('fs');
/*global __dirname */
/*global require */
/*global process */


const projectPath = path.join(__dirname, '../../', process.argv[2]);
process.chdir(projectPath);
const isDebug = process.argv.indexOf('debug') >= 0;

let projectDesc;
const descPath = path.join(projectPath, 'thing-project.json');
if(fs.existsSync(descPath)) {
	projectDesc = JSON.parse(fs.readFileSync(descPath));
}

let confPath;
if (projectDesc && projectDesc.__webpack) {
	confPath = path.join(__dirname, isDebug ? projectDesc.__webpack.debug : projectDesc.__webpack.production);
} else {
	confPath = path.join(projectPath, isDebug ? 'config/webpack.debug.js' : 'config/webpack.prod.js');
}
const projectConfig = require(confPath);

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
