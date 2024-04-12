const path = require('path');
const fs = require('fs');
const md5File = require('md5-file');

const {exec} = require('child_process');
const {walkSync} = require('./editor-server-utils');

const isWin = process.platform === 'win32';

const getCommandPath = (commandName) => {
	const absPath = path.join(__dirname, './.bin/ffmpeg/' + commandName + (isWin ? '.exe' : ''));
	return fs.existsSync(absPath) ? absPath : commandName;
};

module.exports = async function (options, notify) {

	const soundsPath = options.dir;

	let resolve;
	let retPromise = new Promise((_resolve) => {
		resolve = _resolve;
	});
	let result = {};

	notify('Sounds processing...');
	function outputError(err, outError, out) {
		if (!result.errors) {
			result.errors = [];
		}
		result.errors.push({err, out, outError});
		console.error(err);
	}

	let cache;
	let cacheFn = path.join(soundsPath, '~snd-convert-cache.json');
	if (fs.existsSync(cacheFn)) {
		cache = JSON.parse(fs.readFileSync(cacheFn));
	} else {
		cache = {};
	}
	let filesToConvert = [];

	let probePath = getCommandPath('ffprobe');

	let files = walkSync(soundsPath);
	for (let fileEntry of files) {
		const fn = fileEntry.fileName;
		const mTime = fileEntry.mTime;
		if (fn.endsWith('.wav') && (fn.indexOf('/~') < 0)) {
			let bitrate = getBitrate(fn);

			let fileNameWithoutExt = fn.replace(/wav$/gmi, '');
			let allTargetFilesExists = options.formats.every((ext) => {
				return fs.existsSync(fileNameWithoutExt + ext);
			});

			let hash;
			if (cache.hasOwnProperty(fn) && (mTime !== cache[fn].mTime)) {
				hash = await md5FileSafe(fn);
				if (cache[fn].hash === hash) {
					cache[fn].mTime = mTime;
				}
			}

			if (!allTargetFilesExists || (options.noCacheSoundName === fn) || !cache.hasOwnProperty(fn) || (mTime !== cache[fn].mTime) || (bitrate !== cache[fn].bitrate) || !cache[fn].duration) {
				if (!hash) {
					hash = await md5FileSafe(fn);
				}
				cache[fn] = {
					mTime,
					bitrate,
					hash
				};
				filesToConvert.push({name: fn, cache: cache[fn]});
			}
		}
	}

	let promises = [];

	for (let fileData of filesToConvert) {
		for (let format of options.formats) {
			result.updated = true;
			promises.push(new Promise((resolve) => {
				convertFile(fileData, format, resolve);
			}));
		}
	}

	Promise.all(promises).then(() => {
		if (!result.errors && result.updated) {
			fs.writeFileSync(cacheFn, JSON.stringify(cache));
		}
		result.soundInfo = cache;
		resolve(result);
	});

	function getBitrate(fn) {
		let shortFilename = fn.replace(soundsPath, '');
		shortFilename = shortFilename.replace(/\.wav$/gmi, '');
		shortFilename = shortFilename.replace('\\', '/');
		return options.bitRates[shortFilename] || options.defaultBitrate || 96;
	}

	function convertFile(fileData, ext, cb) {
		let fn = fileData.name;
		let bitrate = getBitrate(fn);

		let logTxt = 'convert sound:' + fn + ' -> ' + ext + ' ' + bitrate + 'Kb';
		notify(logTxt);
		let fileParts = path.parse(fn);
		let resultName = fileParts.dir + '/' + fileParts.name + '.' + ext;

		if (fs.existsSync(resultName)) {
			fs.unlinkSync(resultName);
		}

		let additionalOptions = '';
		if (ext === 'webm') {
			additionalOptions = '-dash 1 ';
		}

		additionalOptions += '-b:a ' + bitrate + 'k ';

		let timoutCounter = 0;

		let errorArgs;

		function conversionAttempt() {
			timoutCounter++;
			if (timoutCounter > 5) {
				if (errorArgs) {
					outputError.apply(null, errorArgs);
				}
				cb();
				return;
			}

			try {
				fs.accessSync(fn, fs.constants.R_OK | fs.constants.W_OK);
			} catch (_er) {
				console.log('file reading blocked: ' + fn);
				setTimeout(conversionAttempt, 1000);
				return;
			}
			let ffmpegPath = getCommandPath('ffmpeg');

			exec(ffmpegPath + ' -i "' + fn + '" ' + additionalOptions + ' "' + resultName + '"', (err, out, outError) => {
				if (err) {
					errorArgs = [err, outError, out];
					console.log(err, out);
					console.error(outError);
					throw err;
				} else {
					exec(probePath + ' -show_entries format=duration -v quiet -of csv="p=0" -i "' + fn + '"', (err, out, outError) => {
						if (err) {
							errorArgs = [err, outError, out];
							console.log(err, out);
							console.error(outError);
							throw err;
						} else {
							fileData.cache.duration = parseFloat(out);
							cb();
						}
					});
				}
			});
		}
		conversionAttempt();
	}
	return retPromise;
};

function md5FileSafe(fn) {
	return new Promise((resolve) => {
		try {
			resolve(md5File.sync(fn));
		} catch (_er) {
			setInterval(() => {
				try {
					resolve(md5File.sync(fn));
				} catch (_er) { }
			}, 1000);
		}
	});
}
