/*global module */
/*global require */
/*global process */
/*global __dirname */

const fs = require('fs');
const path = require('path');
const isDebug = (process.argv.indexOf('debug') >= 0) || process.env.THING_ENGINE_DEBUG_BUILD;

const glob = require('glob');

const ignore = '*/.*|' + (isDebug ?'*/___*' : '*/__*');

let copyFilesList = [];

let addedFiles = new Set();

function addSoundsFolderToCopy(libName) {
	glob((libName || '.') + '/snd/**/*.@(webm|weba|ogg|aac|mp3)', {absolute: true, ignore}, function (er, files) {
		for(let from of files) {
			let a = from.split('/snd/');
			a.shift();
			let to =  './snd/' + a.join('/snd/');
			if(!addedFiles.has(to)) {
				addedFiles.add(to);
				copyFilesList.push({from, to});
			}
		}
	});
}

function addImagesFolderToCopy(libName) {
	glob((libName || '.') + '/img/**/*.@(png|jpg|atlas|json|xml)', {absolute: true, ignore}, function (er, files) {
		for(let from of files) {
			let a = from.split('/img/');
			a.shift();
			let to =  './img/' + a.join('/img/');
			if(!addedFiles.has(to)) {
				addedFiles.add(to);
				copyFilesList.push({from, to});
			}
		}
	});
}

addImagesFolderToCopy();
addSoundsFolderToCopy();


let alias = {
	'/thing-editor': path.resolve(__dirname, '..'),
	'thing-editor': path.resolve(__dirname, '..')
};

let projectDesc = JSON.parse(fs.readFileSync('./thing-project.json'));
if(projectDesc.libs) {

	let libs = projectDesc.libs.slice();
	libs.reverse();

	for(let libName of libs) {
		let libRootFolder = path.join(__dirname, '../..', libName);
		if(!fs.existsSync(libRootFolder)) {
			libRootFolder = require.resolve(libName);
		}
		if(fs.existsSync(libRootFolder)) {

			alias[libName] = libRootFolder;

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


const CopyWebpackPlugin = require('copy-webpack-plugin');

copyFilesList.reverse();

const webpack = require('webpack');

module.exports = {
	entry: [
		"babel-polyfill",
		"whatwg-fetch",
		'webfontloader',
		process.env.THING_ENGINE_DEBUG_BUILD ? 'howler/dist/howler.js' : 'howler/dist/howler.core.min.js',
		'./assets.js',
		'./src/index.js'
	],
	resolve: {
		alias/*,
		modules: ['node_modules', path.join(__dirname, '..')]*/
	},
	performance: {
		maxAssetSize: 1000000
	},
	plugins: [
		new CopyWebpackPlugin(copyFilesList),
		new webpack.ProvidePlugin({
			PIXI: 'pixi.js-legacy',
		})],
	module: {
		noParse: /webfontloader/,
		rules: [{
			test: /\.(png|svg|jpg|gif)$/,
			use: [
				'file-loader'
			]
		},
		{
			test: /\.js$/,
			exclude: [/min\.js$/],
			loaders: [
				{
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env']
					}
				},
				'ifdef-loader?{"EDITOR":false,"DEBUG":' + (isDebug ? 'true' : 'false') + '}',
				path.resolve(__dirname, 'assert-strip-loader.js')
			]
		},
		{
			test: /\.js$/,
			include: [
				path.resolve(__dirname, "../js/editor")
			],
			loaders:[
				path.resolve(__dirname, 'editor-code-bundle-prevent.js')
			]
		}]
	}
};
