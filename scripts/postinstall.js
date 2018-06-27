/*global require */
/*global __dirname */
const symlinksMaker = require('./symlinks-maker.js');
const path = require('path');

var clientLibs = [
	['./thing-engine/node_modules', '../node_modules', 'dir'],
	['./node_modules/pixi-filters/dist/pixi-filters.js','js/lib/pixi-filters.js'],
	['./node_modules/react-dom/umd/react-dom.development.js', 'js/lib/react-dom.development.js'],
	['./node_modules/react/umd/react.development.js', 'js/lib/react.development.js'],
	['./node_modules/reset-css/reset.css', 'css/lib/reset.css'],
	['./node_modules/jquery/dist/jquery.min.js', 'js/lib/jquery.min.js'],
	
	['../../node_modules/pixi.js/dist/pixi.min.js', '../thing-engine/js/lib/pixi.min.js'],
	['../../node_modules/pixi-tilemap/bin/pixi-tilemap.js', '../thing-engine/js/lib/pixi-tilemap.js'],
	['../../node_modules/pixi.js/dist/pixi.js', '../thing-engine/js/lib/pixi.js']
];

symlinksMaker.setRootPath(path.resolve(__dirname)+'/../');
symlinksMaker.makeSymlinks(clientLibs);
