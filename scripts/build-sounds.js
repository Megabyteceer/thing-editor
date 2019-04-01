const path = require("path");
const fs = require('fs');
const {
	exec
} = require('child_process');

/*global require */
/*global module */

const wss = require('./server-socket.js');

module.exports = function (projectPath, callback, options) {

	let result = {};
	function outputError(err, out, outError) {
		if(!result.errors) {
			result.errors = [];
		}
		result.errors.push({err, out, outError});
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

	let soundsPath = path.join(projectPath, 'snd/');

	let files = walkSync(soundsPath);
	for (let fn of files) {
		if (fn.endsWith('.wav')) {
			let s = fs.statSync(fn);

			let shortName = fn.replace(/\\/g, '/');
			shortName = shortName.split('/snd/');
			shortName.shift();
			shortName = shortName.join('/snd/');

			let bitrate = getBitrate(fn);

			if ((options.noCacheSoundName === shortName) || !cache.hasOwnProperty(shortName) || (s.mtimeMs !== cache[shortName][bitrate])) {
				filesToConvert.push(fn);
				cache[shortName] = {};
				cache[shortName][bitrate] = s.mtimeMs;
			}
		}
	}
	if (filesToConvert.length < 1) {
		callback(result);
		return;
	}

	function convertNextFile() {
		if (filesToConvert.length < 1 || result.errors) {
			if(!result.errors) {
				fs.writeFileSync(cacheFn, JSON.stringify(cache));
			}
			callback(result);
		} else {
			let fn = filesToConvert.pop();

			let f = options.formats.slice(0);
			const conv = () => {
				if (f.length < 1) {
					convertNextFile();
				} else {
					result.updated = true;
					convertFile(fn, f.pop(), conv);
				}
			};
			conv();
		}
	}

	convertNextFile();

	function getBitrate(fn) {
		let shortFilename = fn.replace(soundsPath, '');
		shortFilename = shortFilename.replace(/\.wav$/gmi, '');
		shortFilename = shortFilename.replace('\\', '/');
		return options.bitrates[shortFilename] || options.defaultBitrate || 96;
	}

	function convertFile(fn, ext, cb) {
		let bitrate = getBitrate(fn);

		let logTxt = 'convert sound:' + fn + ' -> ' + ext + ' ' + bitrate + 'Kb';
		console.log(logTxt);
		wss.notify(logTxt);
		let fileParts = path.parse(fn);
		let resultName = fileParts.dir + '/' + fileParts.name + '.' + ext;

		if(fs.existsSync(resultName)) {
			fs.unlinkSync(resultName);
		}

		let additionalOptions = '';
		if(ext === 'webm') {
			additionalOptions = '-dash 1 ';
		}

		additionalOptions += '-b:a ' + bitrate + 'k ';

		exec('ffmpeg -i "' + fn + '" ' + additionalOptions + ' "' + resultName + '"', (err, out, outError) => {
			if (err) {
				outputError(err, out, outError);
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