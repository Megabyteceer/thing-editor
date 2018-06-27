/*global require */
/*global module */
const fs = require('fs');
const path = require('path');
var rootPath = '';

function createSymlink(src, dest, type) {
	if(!src.startsWith('.')) {
		src = rootPath + src;
		if(!fs.existsSync(src)) {
			throw ("Can't crate symlink. File is not exists: " + src);
		}
	}
	
	
	
	dest = rootPath + dest;
	console.log(src + ' => ' + dest);
	var destFolder = path.dirname(dest);
	if (!fs.existsSync(destFolder)) {
		fs.mkdirSync(destFolder);
	}
	
	if(!fs.existsSync(dest)) {
		fs.symlinkSync(src, dest, type || 'file');
	}
}

module.exports = {
	setRootPath: (path) => {
		rootPath = path;
	},
	makeSymlinks: (clientLibs) => {
		clientLibs.some((a) => {
			createSymlink(a[0], a[1], a[2]);
		});
	}
};