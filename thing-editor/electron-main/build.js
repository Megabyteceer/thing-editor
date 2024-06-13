const path = require('path');
const fs = require('fs');

const {walkSync} = require('./editor-server-utils');

module.exports = {
	build: (projectDir, debug, assetsToCopy, projectDesc) => {
		const editorRoot = path.resolve(__dirname, '../..');
		const root = path.resolve(editorRoot, projectDir);
		const outDir = root + (debug ? '/debug' : '/release');
		const tmpDir = root + '/.tmp';
		const publicDir = tmpDir + '/public';
		const publicAssetsDir = publicDir + '/assets/';

		if (fs.existsSync(publicDir)) {
			let files = walkSync(publicDir);
			for (let fileEntry of files) {
				fs.unlinkSync(fileEntry.fileName);
			}
		}
		if (fs.existsSync(outDir)) {
			let files = walkSync(outDir);
			for (let fileEntry of files) {
				fs.unlinkSync(fileEntry.fileName);
			}
		}

		if (!fs.existsSync(publicDir)) {
			fs.mkdirSync(publicDir);
		}
		if (!fs.existsSync(publicAssetsDir)) {
			fs.mkdirSync(publicAssetsDir);
		}
		return Promise.all(assetsToCopy.map((asset) => {
			return new Promise((resolve, reject) => {
				const to = publicAssetsDir + asset.to;
				const dirName = path.dirname(to);
				if (!fs.existsSync(dirName)) {
					fs.mkdirSync(dirName, {recursive: true});
				}
				fs.copyFile(editorRoot + asset.from, to, (er) => {
					if (er) {
						debugger;
						reject(er);
					} else {
						resolve();
					}
				});
			});
		})).then(() => {
			return require('vite').build(require(path.resolve(editorRoot, debug ? projectDesc.__buildConfigDebug : projectDesc.__buildConfigRelease))(root, publicDir, outDir, debug, projectDesc)).then((res) => {
				require('./static-server.js');
				console.log('BUILD COMPLETE: ' + 'http://localhost:5174/' + projectDir);
				return res;
			}).catch((er) => {
				console.error(er.stack);
				return er;
			});
		});
	}
};
