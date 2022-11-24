/*global module */
/*global require */
/*global process */
/*global __dirname */

const fs = require('fs');
const path = require('path');
const isDebug = (process.argv.indexOf('debug') >= 0) || process.env.THING_ENGINE_DEBUG_BUILD;

const glob = require('glob');

const ignore = '*/.*|' + (isDebug ? '*/___*' : '*/__*');

let copyFilesList = [];

let addedFiles = new Set();

let projectHasSounds;
let hasSpinesVersion3 = false;
let hasSpinesVersion4 = false;

function addSoundsFolderToCopy(libName) {
	let files = glob((libName || '.') + '/snd/**/*.@(webm|weba|ogg|aac|mp3)', {absolute: true, sync: true, ignore});
	for(let from of files) {
		if(from.indexOf('/~') < 0) {
			let a = from.split('/snd/');
			a.shift();
			let to = './snd/' + a.join('/snd/');
			if(!addedFiles.has(to)) {
				addedFiles.add(to);
				copyFilesList.push({from, to});
				projectHasSounds = true;
			}
		}
	}
}

function addImagesFolderToCopy(libName) {
	let files = glob((libName || '.') + '/img/**/*.@(png|jpg|atlas|json|xml)', {absolute: true, sync: true, ignore});
	for(let from of files) {
		if(from.indexOf('/~') < 0) {
			let a = from.split('/img/');
			a.shift();
			let to = './img/' + a.join('/img/');

			if(from.endsWith('.json')) {
				const jsonContent = fs.readFileSync(from);
				if(/"spine":"4\.[^"]*"/.test(jsonContent)) {
					hasSpinesVersion4 = true;
				} else if(/"spine":"3\.[^"]*"/.test(jsonContent)) {
					hasSpinesVersion3 = true;
				}
			}

			if(!addedFiles.has(to)) {
				addedFiles.add(to);
				copyFilesList.push({from, to});
			}
		}
	}
}

addImagesFolderToCopy();
addSoundsFolderToCopy();


let alias = {
	'/thing-editor': path.resolve(__dirname, '..'),
	'thing-editor': path.resolve(__dirname, '..'),
	'src': path.resolve(process.cwd(), 'src')
};

const projectDesc = JSON.parse(process.env.projectDesc);

if(projectDesc.libs) {

	let libs = projectDesc.libs.slice();
	libs.reverse();

	for(let libName of libs) {
		let libRootFolder;
		if(libName.startsWith('.')) {
			libRootFolder = path.join(process.cwd(), libName);
		} else {
			libRootFolder = path.join(__dirname, '../..', libName);
		}
		if(!fs.existsSync(libRootFolder)) {
			libRootFolder = require.resolve(libName);
		}
		if(fs.existsSync(libRootFolder)) {

			//alias 'aaa/bbb', 'aaa/bbb/ccc' libraries as 'aaa'
			let libNameFolders = libName.split('/').filter(f => !f.startsWith('.'));
			let cropFoldersCount = libNameFolders.length - 1;
			let lr = libRootFolder;
			let ln = libName;
			while(cropFoldersCount > 0) {
				lr = lr.replace(/[\/\|\\]\w+$/gm, '');
				ln = ln.replace(/[\/\|\\]\w+$/gm, '');
				cropFoldersCount--;
			}
			alias[ln] = lr;
			alias['/' + ln] = lr;

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

let bundleEntries = [
	"whatwg-fetch"
];
if(projectDesc.webfontloader && Object.keys(projectDesc.webfontloader).some((k) => {
	let p = projectDesc.webfontloader[k];
	return Array.isArray(p.families) && p.families.length > 0;
})) {
	bundleEntries.push('webfontloader');
}
if(projectHasSounds) {
	bundleEntries.push(isDebug ? 'howler/dist/howler.js' : 'howler/dist/howler.core.min.js');
}

bundleEntries = bundleEntries.concat([
	'./assets.js',
	'./src/classes.js',
	'./src/index.js'
]);

const mode = isDebug ? 'development' : 'production';
const buildPath = path.resolve(process.cwd(), isDebug ? 'debug' : 'release');

(fs.rmSync || fs.rmdirSync)(buildPath, {force: true, recursive: true});

const config = {
	entry: {
		bundle: bundleEntries
	},
	mode: mode,
	resolve: {
		alias/*,
		modules: ['node_modules', path.join(__dirname, '..')]*/
	},
	devtool: isDebug ? 'inline-source-map' : undefined,
	optimization: {
		minimize: !isDebug
	},
	output: {
		filename: '[name].js',
		chunkFilename: 'chunks/[id].js',
		path: buildPath,
	},
	performance: {
		maxAssetSize: 2000000,
		maxEntrypointSize: 2000000
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(mode)
		}),
		new CopyWebpackPlugin({
			patterns: copyFilesList,
		}),
	],
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
			use: [
				{
					loader: 'babel-loader',
					options: {
						"plugins": [
							[
								"@babel/plugin-transform-block-scoping", {
									"throwIfClosureRequired": false
								}
							]
						],
						presets: [['@babel/preset-env',
							{
								"useBuiltIns": "entry",
								"corejs": "3.8",
								"targets": "last 3 Chrome versions, last 3 Firefox versions, last 3 ChromeAndroid versions, last 3 iOS versions, last 3 Safari versions"
							}]]
					}
				},
				{
					loader: "ifdef-loader",
					options: {
						EDITOR: false,
						DEBUG: !!isDebug,
					}
				},
				path.resolve(__dirname, 'assert-strip-loader.js')
			]
		},
		{
			test: /\.js$/,
			include: [
				path.resolve(__dirname, "../js/editor")
			],
			use: [
				path.resolve(__dirname, 'editor-code-bundle-prevent.js')
			]
		}]
	}
};

const providePluginOptions = {
	PIXI: 'pixi.js',
};
if(hasSpinesVersion3 && hasSpinesVersion4) {
	providePluginOptions['PIXI.spine'] = 'pixi-spine';
	console.warn(`❗️ Both versions of Spine are used in project (3.8 and 4.0). So bundle size will be increased to support both versions`);
} else if(hasSpinesVersion3) {
	providePluginOptions['PIXI.spine'] = '@pixi-spine/all-3.8';
} else if(hasSpinesVersion4) {
	providePluginOptions['PIXI.spine'] = '@pixi-spine/all-4.0';
}
config.plugins.push(new webpack.ProvidePlugin(providePluginOptions));
config.plugins.push(new webpack.DefinePlugin({'process.env.SPINE_VERSION': JSON.stringify(providePluginOptions['PIXI.spine'])}));

if(!isDebug) {
	const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin');

	config.plugins.push(new ImageMinimizerPlugin({
		loader: false,
		severityError: 'warning',
		minimizerOptions: {
			plugins: [
				[
					'pngquant',
					{
						speed: 1,
						strip: true,
						quality: projectDesc.pngQuality,
						dithering: false,
					}
				]
			],
		},
	}));
}

module.exports = config;
