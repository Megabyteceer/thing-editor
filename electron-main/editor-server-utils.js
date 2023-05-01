const path = require('path');
const fs = require('fs');

const walkSync = (dir, fileList = []) => {
	fs.readdirSync(dir).forEach(file => {
		if(!file.startsWith('~')) {
			let fullPath = path.join(dir, file);
			let stats = fs.statSync(fullPath);
			if(stats.isDirectory()) {
				fileList = walkSync(fullPath, fileList);
			} else if(stats.size > 0) {
				fileList.push({name: fullPath, mtime: stats.mtimeMs});
			}
		}
	});
	return fileList;
};

module.exports = {walkSync};