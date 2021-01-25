const path = require('path');
const fs = require('fs');

const from = '../node_modules';
const to = '../../node_modules';
if (!fs.existsSync(to)) {
	fs.renameSync(from, to);
} 

copyRecursiveSync(path.join(__dirname, 'vscode.folder.settings'), path.join(__dirname, '../../'));

function copyRecursiveSync(src, dest) {
	var exists = fs.existsSync(src);
	var stats = exists && fs.statSync(src);
	var isDirectory = exists && stats.isDirectory();
	if (exists && isDirectory) {
		if (!fs.existsSync(dest)) {
			fs.mkdirSync(dest);
		}
		fs.readdirSync(src).forEach(function (childItemName) {
			copyRecursiveSync(path.join(src, childItemName),
				path.join(dest, childItemName));
		});
	} else {
		if (!fs.existsSync(dest)) {
			fs.copyFileSync(src, dest);
		}
	}
}
