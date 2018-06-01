const webpack = require("webpack");
const path = require("path");

const ifdefOptions = {
	EDITOR: false,
	DEBUG: false,
	version: 1
};

const symlinksMaker = require('./symlinks-maker.js');


module.exports = function(projectPath, callback) {
	
	symlinksMaker.setRootPath(projectPath);
	
	var foldersToShare = {
		'img': '.dist/img'
	};
	symlinksMaker.makeSymlinks(foldersToShare);
	
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
		mode: 'production', //development, production
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
	
	webpack(config, (err, stats) => {
		result = [];
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