
const path = require("path");
/*global __dirname */
/*global require */
/*global process */

let fs = require('fs');
let projectPath = process.argv[2];
projectPath = path.join(__dirname, '../../', projectPath);
process.chdir(projectPath);
let isDebug = process.argv.indexOf('debug') >= 0;
let confPath = path.join(projectPath, isDebug ? 'config/webpack.debug.js' : 'config/webpack.prod.js');
let projectConfig = require(confPath);

const copyPluginOptions = isDebug ? 
	{
		ignore: ['___*', '*/___*']
	} : {
		ignore: ['__*', '*/__*']
	};

let copyFilesList = [
	'assets.js'
];

function addSoundsFolderToCopy(libName) {
	copyFilesList = ['webm', 'weba', 'ogg', 'aac', 'mp3'].map((ext) => {
		if(!libName) {
			return './snd/**/*.' + ext;
		}
		return {
			from: libName + '/snd/**/*.' + ext,
			to: './',
			transformPath(targetPath) {
				let a = targetPath.split('/snd/');
				a.shift();
				return './snd/' + a.join('/snd/');
			}
		};
	}).concat(copyFilesList);
}

function addImagesFolderToCopy(libName) {
	copyFilesList = ['png', 'jpg', 'atlas', 'json'].map((ext) => {
		if(!libName) {
			return './img/**/*.' + ext;
		}
		return {
			from: libName + '/img/**/*.' + ext,
			to: './',
			transformPath(targetPath) {
				let a = targetPath.split('/img/');
				a.shift();
				return './img/' + a.join('/img/');
			}
		};
	}).concat(copyFilesList);
}

addImagesFolderToCopy();
addSoundsFolderToCopy();

let projectDesc = require(path.join(projectPath, './thing-project.json'));
if(projectDesc.libs) {
	for(let libName of projectDesc.libs) {
		let libRootFolder = path.join(__dirname, '../..', libName);
		if(fs.existsSync(libRootFolder)) {
			if(fs.existsSync(path.join(libRootFolder, 'snd'))) {
				addSoundsFolderToCopy(libRootFolder);
			}
			if(fs.existsSync(path.join(libRootFolder, 'img'))) {
				addImagesFolderToCopy(libRootFolder);
			}
		} else {
			throw new Error("library folder '" + libName + "' not found.");
		}
	}
}

const merge = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');


let config = merge(projectConfig, {
	plugins: [
		new CopyWebpackPlugin(copyFilesList, copyPluginOptions)
	],
});

const webpack = require("webpack");
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
