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
	if (fs.exists(cacheFn)) {
		cache = JSON.parse(fs.readFileSync(cacheFn));
	} else {
		cache = {};
	}
	let filesToConvert = [];

	let files = walkSync(path.join(projectPath, 'snd'));
	for (let fn of files) {
		if (fn.endsWith('.wav')) {
			let s = fs.statSync(fn);
			if (noCache || !cache.hasOwnProperty(fn) || (s.mtimeMs !== cache[fn].mtimeMs)) {
				filesToConvert.push(fn);
				cache[fn] = {
					mtimeMs: s.mtimeMs
				};
			}
		}
	}
	fs.writeFileSync(cacheFn, JSON.stringify(cache));

	let soundsData;
	let soundsDataFn = path.join(projectPath, 'snd/sounds.json');
	if (fs.exists(soundsDataFn)) {
		soundsData = JSON.parse(fs.readFileSync(soundsDataFn));
	} else {
		soundsData = {};
	}

	function convertNextFile() {
		if (filesToConvert.length < 1) {
			fs.writeFileSync(soundsDataFn, JSON.stringify(soundsData));
			callback(result);
		} else {
			let fn = filesToConvert.pop();

			let f = formats.slice(0);
			const conv = () => {
				if (f.length < 1) {
					convertNextFile();
				} else {
					convertFile(fn, f.pop(), soundsData, conv);
				}
			};
			conv();
		}
	}
	convertNextFile();

	function convertFile(fn, ext, soundsData, cb) {
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
			getSoundFormat(fn, (sourceFormat) => {
				getSoundFormat(resultName, (resultFormat) => {
					soundsData[fileParts.name + '.' + ext] = {
						s: resultFormat.start_time,
						d: resultFormat.duration
					};
					cb();
				});
			});
		});
	}

	function getSoundFormat(fn, cb) {
		exec('ffprobe "' + fn + '" -show_format', (err, stdout, stderr) => {
			if (err) {
				outputError(err);
			}
			let ret = {};
			for(let line of stdout.split('\n')) {
				let a = line.split('=');
				if(a.length === 2) {
					ret[a[0].trim()] = a[1].trim();
				}
			}
			cb(ret);
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