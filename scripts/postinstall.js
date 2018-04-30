const fs = require('fs');
const path = require('path')
const rootPath = path.resolve(__dirname)+'/../';


//========= libs reflection to public ===================================================
const ef = () => {};
var clientLibs = {
	'public/editor/js/lib/pixi-filters.js': 'node_modules/pixi-filters/dist/pixi-filters.js',
	'public/editor/js/lib/react-dom.development.js': 'node_modules/react-dom/umd/react-dom.development.js',
	'public/editor/js/lib/react.development.js': 'node_modules/react/umd/react.development.js',
	'public/editor/css/lib/reset.css': 'node_modules/reset-css/reset.css',
	
	'public/engine/js/lib/jquery.min.js': 'node_modules/jquery/dist/jquery.min.js',
	'public/engine/js/lib/pixi.min.js': 'node_modules/pixi.js/dist/pixi.min.js',
	'public/engine/js/lib/pixi.js': 'node_modules/pixi.js/dist/pixi.js'
};

function createSymlink(src, dest) {
	src = rootPath + src;
	dest = rootPath + dest;
	var destFolder = path.dirname(dest);
	if (!fs.existsSync(destFolder)) {
		fs.mkdirSync(destFolder);
	}
	fs.symlink(src, dest, ef);
}
Object.keys(clientLibs).some((k) => {
	createSymlink(clientLibs[k], k);
});