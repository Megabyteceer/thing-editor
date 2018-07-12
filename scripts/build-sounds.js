const path = require("path");
const fs = require('fs');
const {
	exec
} = require('child_process');

/*global require */
/*global module */

module.exports = function (projectPath, callback, formats, noCache) {
	let result = {};
	function outputError(err) {
		if(!result.errors) {
			result.errors = [];
		}
		result.errors.push(err);
		console.error(err);
	}

	let cache;
	let cacheFn = path.join(projectPath, 'snd/snd-convert-cache.json');
	if (fs.existsSync(cacheFn)) {
		cache = JSON.parse(fs.readFileSync(cacheFn));
	} else {
		cache = {};
	}
	let filesToConvert = [];

	let files = walkSync(path.join(projectPath, 'snd'));
	for (let fn of files) {
		if (fn.endsWith('.wav')) {
			let s = fs.statSync(fn);

			let shortName = fn.replace(/\\/g, '/');
			shortName = shortName.split('/snd/');
			shortName.shift();
			shortName = shortName.join('/snd/');

			if (noCache || !cache.hasOwnProperty(shortName) || (s.mtimeMs !== cache[shortName].mtimeMs)) {
				filesToConvert.push(fn);
				cache[shortName] = {
					mtimeMs: s.mtimeMs
				};
			}
		}
	}
	if (filesToConvert.length < 1) {
		callback(result);
		return;
	}
	
	fs.writeFileSync(cacheFn, JSON.stringify(cache));


	function convertNextFile() {
		if (filesToConvert.length < 1) {
			callback(result);
		} else {
			let fn = filesToConvert.pop();

			let f = formats.slice(0);
			const conv = () => {
				if (f.length < 1) {
					convertNextFile();
				} else {
					convertFile(fn, f.pop(), conv);
				}
			};
			conv();
		}
	}

	convertNextFile();

	function convertFile(fn, ext, cb) {
		console.log('convert sound:' + fn + ' -> ' + ext);
		let fileParts = path.parse(fn);
		let resultName = fileParts.dir + '/' + fileParts.name + '.' + ext;

		if(fs.existsSync(resultName)) {
			fs.unlinkSync(resultName);
		}

		let additionalOptions = '';
		if(ext === 'webm') {
			additionalOptions = ' -dash 1 ';
		}

		exec('ffmpeg -i "' + fn + '" ' + additionalOptions + ' "' + resultName + '"', (err, stdout, stderr) => {
			if (err) {
				outputError(err);
			}
			cb();
		});
	}
};


//=========== enum files ================================
const walkSync = (dir, filelist = []) => {
	fs.readdirSync(dir).forEach(file => {
		let stats = fs.statSync(path.join(dir, file));

		if (stats.isDirectory()) {
			filelist = walkSync(path.join(dir, file), filelist);
		} else if (stats.size > 0) {
			filelist.push(path.join(dir, file));
		}
	});
	return filelist;
};