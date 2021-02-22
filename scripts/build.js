
const path = require("path");
const fs = require('fs');
const ChildProcess = require('child_process');
/*global __dirname */
/*global require */
/*global process */

function getLibRoot(libName) {
	return path.join(__dirname, '../..', libName);
}

const projectPath = path.join(__dirname, '../../', process.argv[2]);
process.chdir(projectPath);
const isDebug = process.argv.indexOf('debug') >= 0;

let projectDesc = {};
const descPath = path.join(projectPath, 'thing-project.json');
if(fs.existsSync(descPath)) {
	let pureProjectDesc = JSON.parse(fs.readFileSync(descPath));
	
	if(pureProjectDesc.libs) {
		for(let libName of pureProjectDesc.libs) {
			let libSettingsFilename = path.join(getLibRoot(libName), 'settings.json');
			if(fs.existsSync(libSettingsFilename)) {
				projectDesc = Object.assign(projectDesc, JSON.parse(fs.readFileSync(libSettingsFilename)));
			}
		}
	}
	projectDesc = Object.assign(projectDesc, pureProjectDesc);

}

process.env.projectDesc = JSON.stringify(projectDesc);
try {
	process.env.BUILD_VERSION = ChildProcess.execSync("git describe --always --tags", {cwd: projectPath})
		.toString()
		.trim();
} catch(e) {
	process.env.BUILD_VERSION = Date.now();
}

let confPath = isDebug ? projectDesc.__webpack.debug : projectDesc.__webpack.production;

if(fs.existsSync(path.join(projectPath, confPath))) {
	confPath = path.join(projectPath, confPath);
}

const projectConfig = require(confPath);

const webpack = require("webpack");
webpack(projectConfig, (err, stats) => {
	const isErrors = err || stats.hasErrors();
	if (isErrors) {
		console.error(`\n[1m[31mBUILD FAILED![0m\n\n${err ? err.message : stats.toString({warnings: false, assets: false, modules: false, colors: true})}`);
	}
	if (stats) {
		console.log(isErrors ? '[1m[31mBUILD FAILED![0m\n' : '[1m[32mBUILD SUCCESS![0m\n');
		console.log(stats.toString({assets: false, modules: false, colors: true}));
	}
});
