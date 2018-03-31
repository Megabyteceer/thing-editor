const fs = require('fs');
const path = require('path')
const rootPath = path.resolve(__dirname)+'/../';


//========= libs reflection to public ===================================================
const ef = () => {};
var clientJsLibs = {
	'react-dom.development.js': 'node_modules/react-dom/umd/react-dom.development.js',
	'react.development.js': 'node_modules/react/umd/react.development.js',
	'jquery.min.js': 'node_modules/jquery/dist/jquery.min.js',
	'pixi.min.js': 'node_modules/pixi.js/dist/pixi.min.js'
};

createSymlink(rootPath + 'node_modules/reset-css/reset.css', 'public/css/reset.css');

var libsFolder = rootPath + 'public/js/lib/';
if (!fs.existsSync(libsFolder)) {
    fs.mkdirSync(libsFolder);
}
function createSymlink(src, dest) {
	if(fs.existsSync(src)) {
		fs.symlink(src, dest, ef);
	}
}
Object.keys(clientJsLibs).some((k) => {
	var src = rootPath + clientJsLibs[k];
	var dest = libsFolder + k;
	createSymlink(src, dest);
});