const symlinksMaker = require('./symlinks-maker.js');
const path = require('path');

var clientLibs = {
	'node_modules/pixi-filters/dist/pixi-filters.js': 'public/editor/js/lib/pixi-filters.js',
	'node_modules/react-dom/umd/react-dom.development.js': 'public/editor/js/lib/react-dom.development.js',
	'node_modules/react/umd/react.development.js': 'public/editor/js/lib/react.development.js',
	'node_modules/reset-css/reset.css': 'public/editor/css/lib/reset.css',
	'node_modules/jquery/dist/jquery.min.js': 'public/editor/js/lib/jquery.min.js'
};

symlinksMaker.setRootPath(path.resolve(__dirname)+'/../');
symlinksMaker.makeSymlinks(clientLibs);
