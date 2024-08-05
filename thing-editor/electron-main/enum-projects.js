const fs = require('fs');
const path = require('path');

const GAMES_ROOT = path.join(__dirname, '../../games');

const enumProjects = (ret = [], subDir = '') => {
	let dir = path.join(GAMES_ROOT, subDir);
	fs.readdirSync(dir).forEach(file => {
		if (file !== '.git' && file !== 'node_modules') {
			let dirName = path.join(dir, file);
			if (fs.statSync(dirName).isDirectory()) {
				let projDescFile = dirName + '/thing-project.json';
				if (fs.existsSync(projDescFile)) {
					let desc;
					try {
						desc = JSON.parse(fs.readFileSync(projDescFile, 'utf8'));
					} catch (er) {
						throw (new Error('Error in file: ' + projDescFile + '\n' + er.message));
					}
					desc.dir = subDir ? (subDir + '/' + file) : file;
					ret.push(desc);
				} else {
					enumProjects(ret, subDir ? (subDir + '/' + file) : file);
				}
			}
		}
	});
	return ret;
};

module.exports = enumProjects;
