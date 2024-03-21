
const path = require('path');
const fs = require('fs');

const walkSync = (dir, fileList = []) => {
	fs.readdirSync(dir).forEach(file => {
		if (!file.startsWith('~')) {
			let fullPath = path.join(dir, file);
			let stats = fs.statSync(fullPath);
			if (stats.isDirectory()) {
				fileList = walkSync(fullPath, fileList);
			} else if (stats.size > 0) {
				if (path.sep !== '/') {
					fullPath = fullPath.replaceAll(path.sep, '/');
				}
				fileList.push({fileName: fullPath, mTime: stats.mtimeMs});
			}
		}
	});
	return fileList;
};

module.exports = {walkSync};
