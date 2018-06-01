const fs = require('fs');
const path = require('path')
var rootPath = path.resolve(__dirname)+'/../';

const ef = () => {};

function createSymlink(src, dest) {
	src = rootPath + src;
	dest = rootPath + dest;
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