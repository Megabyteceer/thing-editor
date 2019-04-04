/*global require */
/*global __dirname */
const symlinksMaker = require('./symlinks-maker.js');
const path = require('path');

var clientLibs = [
	['./thing-engine/node_modules', '../node_modules', 'dir'],
	['../../thing-engine', '../node_modules/thing-engine', 'dir'],
	['../../node_modules/pixi-filters/dist/pixi-filters.js', 'js/lib/pixi-filters.js'],
	['../../node_modules/react-dom/umd/react-dom.development.js', 'js/lib/react-dom.development.js'],
	['../../node_modules/react/umd/react.development.js', 'js/lib/react.development.js'],
	['../../node_modules/reset-css/reset.css', 'css/lib/reset.css'],
	['../../node_modules/react-dom/umd/react-dom.production.min.js', 'js/lib/react-dom.production.min.js'],
	['../../node_modules/react/umd/react.production.min.js', 'js/lib/react.production.min.js'],

	['../../node_modules/webfontloader/webfontloader.js', '../thing-engine/js/lib/webfontloader.js'],
	['../../node_modules/howler/dist/howler.core.min.js', '../thing-engine/js/lib/howler.core.min.js'],
	['../../node_modules/pixi.js/dist/pixi.min.js', '../thing-engine/js/lib/pixi.min.js'],
	['../../node_modules/pixi.js/dist/pixi.js', '../thing-engine/js/lib/pixi.js'],
	['../../node_modules/pixi-spine/bin/pixi-spine.js', '../thing-engine/js/lib/pixi-spine.js']
];

symlinksMaker.setRootPath(path.resolve(__dirname)+'/../');
symlinksMaker.makeSymlinks(clientLibs);
