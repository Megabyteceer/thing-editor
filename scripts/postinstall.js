const symlinksMaker = require('../../thing-engine/scripts/symlinks-maker.js');
const path = require('path');

var clientLibs = {
	'../thing-engine/node_modules': '../node_modules',
	'node_modules/pixi-filters/dist/pixi-filters.js': 'public/js/lib/pixi-filters.js',
	'node_modules/react-dom/umd/react-dom.development.js': 'public/js/lib/react-dom.development.js',
	'node_modules/react/umd/react.development.js': 'public/js/lib/react.development.js',
	'node_modules/reset-css/reset.css': 'public/css/lib/reset.css',
	'node_modules/jquery/dist/jquery.min.js': 'public/js/lib/jquery.min.js',
};

symlinksMaker.setRootPath(path.resolve(__dirname)+'/../');
symlinksMaker.makeSymlinks(clientLibs);
