const webpack = require("webpack");
const path = require("path");

const ifdefOptions = {
	EDITOR: false,
	DEBUG: false,
	version: 1
};

const symlinksMaker = require('./symlinks-maker.js');


module.exports = function(projectPath, callback) {
	console.log('ENTER: ' + projectPath);
	symlinksMaker.setRootPath(projectPath);
	
	var foldersToShare = {
		'../../../dist-template/index.html': '.dist/index.html',
		'../../../node_modules/pixi.js/dist/pixi.min.js': '.dist/pixi.min.js',
		'img': '.dist/img'
	};
	symlinksMaker.makeSymlinks(foldersToShare);
	console.log(1);
	const loaders = [{
		test: /\.js$/, 
		use: [
			{
				loader: "ifdef-loader",
				options: ifdefOptions 
			},
			{
				loader: path.resolve(__dirname, 'assert-strip-loader.js')
			}
		]
	}];

	let config = {
		mode: 'development', //development, production
		module: { rules: loaders },
		entry: projectPath + 'src/index.js',
		output: {
			path: projectPath + '.dist',
			filename: "bundle.js"
		},
		resolve: {
			alias: {
				'/engine': path.resolve(__dirname, '../public/engine/'),
				'src': projectPath + 'src/'
			}
		}
	};
	console.log(3);
	webpack(config, (err, stats) => {
		result = [];
		console.log('RESULT:');
		function errorHandle(err) {
			var txt = 'ERROR: '+ err;
			result.push (txt);
			console.log(txt);
		}
		function warnHandle(err) {
			var txt = 'WARNING: '+ err;
			result.push (txt);
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