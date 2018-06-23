const fs = require('fs');
const path = require('path')
var rootPath = '';

const ef = () => {};

function createSymlink(src, dest) {
	if(!src.startsWith('.')) {
		src = rootPath + src;
	}
	
	if(!fs.existsSync(src)) {
		throw ("Can't crate symlink. File is not exists: " + src);
	}
	
	dest = rootPath + dest;
	console.log(src + ' => ' + dest);
	var destFolder = path.dirname(dest);
	if (!fs.existsSync(destFolder)) {
		fs.mkdirSync(destFolder);
	}
	fs.symlink(src, dest, ef);
}

module.exports = {
	setRootPath: (path) => {
		rootPath = path;
	},
	makeSymlinks: (clientLibs) => {
		Object.keys(clientLibs).some((k) => {
			createSymlink(k, clientLibs[k]);
		});
	}
}