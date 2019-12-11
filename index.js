/*global require */
/*global __dirname */
/*global process */
/*global Buffer */

const log = console.log;
let bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const open = require('open');

process.chdir(path.join(__dirname, '..'));

const {
	exec
} = require('child_process');

const buildSounds = require('./scripts/build-sounds.js');

let currentGame;
let currentGameDesc;
let currentGameRoot;
let fullRoot = path.join(__dirname, '../');
let assetsMap = new Map();

let PORT = 32023;
let gamesRoot = 'games';
let jsonParser = bodyParser.json({limit:1024*1024*200});

//========= File System access commands ====================

app.get('/fs/projects', function (req, res) {
	res.send(enumProjects());
});

app.get('/fs/openProject', function (req, res) {
	let folder = path.join(gamesRoot, req.query.dir, '/');
	let descPath = path.join(folder, 'thing-project.json');
	if(fs.existsSync(descPath)) {
		currentGame = req.query.dir;
		currentGameRoot = folder;
		log('Project opened: ' + currentGameRoot);
		let projectDescSrc = fs.readFileSync(descPath);
		currentGameDesc = JSON.parse(projectDescSrc);

		initWatchers();
		res.send(projectDescSrc);
		excludeAnotherProjectsFromCodeEditor();

	} else {
		log('Can\'t open project: ' + req.query.dir);
		res.send('false');
	}
});

app.get('/fs/enum', function (req, res) {
	res.send(enumFiles());
});

app.get('/fs/delete', function (req, res) {
	if(!currentGame) throw 'No game opened';
	let fn = mapFileUrl(req.query.f);
	try {
		fs.unlinkSync(fn);
		res.end('{}');
	} catch (err) {
		res.end(JSON.stringify({error: 'Can not delete file: ' + fn}));
	}
});

app.get('/fs/edit', function (req, res) {
	if(!currentGame) throw 'No game opened';
	
	let fn = mapFileUrl(req.query.f);
	if(!fn.startsWith(fullRoot)) {
		fn = path.join(fullRoot, fn);
	}

	setTimeout(() => {
		"use strict";
		try {
			open(fn);
			res.end('{}');
		} catch (err) {
			res.end(JSON.stringify({error: 'Can not open file to edit: ' + fn}));
		}
	},100);

});

app.post('/fs/fetch', jsonParser, function (req, res) {


	let fetch = require('node-fetch');
	fetch(req.body.url, req.body.options).then((response) => response.text())
		.then((data) => {
			if(typeof data !== 'string') {
				data = JSON.stringify(data);
			}
			res.end(data);
		}).catch((err) => {
			console.error(err);
			res.status(500).send("Thing-editor proxy fetch fails with result: " + JSON.stringify(err));	
		});
});

app.get('/fs/build', function (req, res) {
	
	log('BUILD project: ' + currentGameRoot);
	wss.showSpinner();
	let command = 'node "' +
	path.join(__dirname, 'scripts/build.js') + '" "' +
	currentGameRoot+'" ' + 
	(req.query.debug ? 'debug' : '');
	command = command.replace(pathSeparatorReplaceExp, '/');
	exec(command,
		{maxBuffer: 1024 * 5000},
		(err, stdOut, errOut) => {
			log(errOut);
			if(errOut instanceof Buffer) {
				errOut = errOut.toString();
			}
			if(stdOut instanceof Buffer) {
				stdOut = stdOut.toString();
			}
			let ret = stdOut.split('\n').concat(errOut.split('\n'));
			if(err) {
				ret.unshift('ERROR: ' + JSON.stringify(err));
			}
			res.end(JSON.stringify(ret));
			wss.hideSpinner();
		});
});

app.post('/fs/build-sounds', jsonParser, function (req, res) {
	log('BUILD sounds: ' + currentGameRoot);
	let fullResult = {};

	let foldersToProcess = ([currentGameRoot].concat((currentGameDesc.libs || []).map(getLibRoot)));

	const processOneFolder = () => {
		if(foldersToProcess.length > 0) {
			let folderName = foldersToProcess.shift();
			buildSounds(folderName,
				function (result) {
					for(let key of Object.keys(result)) {
						fullResult[key] = fullResult[key] || result[key];
					}
					processOneFolder();
				}, req.body
			);
		} else {
			res.end(JSON.stringify(fullResult));
		}
	};
	processOneFolder();
});

app.post('/fs/savefile', jsonParser, function (req, res) {
	let fileName = mapFileUrl(req.body.filename);
	//log('Save file: ' + fileName);
	ensureDirectoryExistence(fileName);
	fs.writeFile(fileName, req.body.data, function(err) {
		if(err) {
			throw err;
		}
		res.end();
	});
});

app.use('/', (req, res, next) => {
	absoluteImportsFixer(path.join(__dirname, '..', decodeURIComponent(req.path)), req, res, next);
});

app.use('/games/',  (req, res) => {
	res.sendFile(path.join(fullRoot, mapAssetUrl(decodeURIComponent(req.path))));
});

app.use('/', express.static(path.join(__dirname, '../'), {dotfiles:'allow'}));

function mapFileUrl(url) {
	let fileName =url.replace('/games', '');
	if(assetsMap.has(fileName)) {
		return assetsMap.get(fileName);
	} else {
		return path.join(fullRoot, url);
	}
}

function mapAssetUrl(url) {
	let fileName = url.split('?')[0];
	if(assetsMap.has(fileName)) {
		return assetsMap.get(fileName);
	} else {
		return '/games' + url;
	}
}



//========= start server ================================================================
let server = app.listen(PORT, () => log('Thing-editor listening on port ' + PORT + '!')); // eslint-disable-line no-unused-vars
if(process.argv.indexOf('n') < 0) {
	
	open('http://127.0.0.1:' + PORT + '/thing-editor', {app: [
		(process.platform == 'darwin') ?
			'Google Chrome'
			:
			'chrome'
		, /*--new-window --no-sandbox --js-flags="--max_old_space_size=32768"--app=*/]});
}

let wss = require('./scripts/server-socket.js');

//=========== enum files ================================
let pathSeparatorReplaceExp = /\\/g;
let pathSeparatorReplace = (stat) => {
	stat.name = stat.name.replace(pathSeparatorReplaceExp, '/');
};

function getLibRoot(libName) {
	return path.join(__dirname, '..', libName);
}

const ASSETS_FOLDERS_NAMES = ['snd', 'img', 'src/scenes', 'src/game-objects', 'scenes', 'prefabs'];
function getDataFolders() {
	let ret = ASSETS_FOLDERS_NAMES.map((type) => {
		return {
			type,
			path: path.join(currentGameRoot, type)
		};
	});
	ret.push({
		type: 'i18n',
		path: path.join(currentGameRoot, currentGameDesc.localesPath)
	});

	if(currentGameDesc.libs) {
		for(let libName of currentGameDesc.libs) {
			let libRootFolder = getLibRoot(libName);
			if(fs.existsSync(libRootFolder)) {
				for(let type of ASSETS_FOLDERS_NAMES) {
					let assetsFolder = path.join(libRootFolder, type);
					if(fs.existsSync(assetsFolder)) {
						ret.push({
							type,
							path: path.join(libName, type),
							lib: libName
						});
					}
				}
			} else {
				throw new Error("library folder '" + libName + "' not found.");
			}
		}
	}
	return ret;
}

function enumFiles() {
	if(!currentGame) throw 'No game opened';
	let ret = {};

	assetsMap = new Map();

	let gameURL = '/' + currentGame + '/';

	for (let f of getDataFolders()) {
		let type = f.type;
		if(!ret[type]) {
			ret[type] = [];
		}
		let a = [];
		
		if(fs.existsSync(f.path)) {
			walkSync(f.path, a);
		}
		a = a.filter((fileData) => {
			pathSeparatorReplace(fileData);

			if(f.lib) {
				fileData.lib = f.lib;
			}
			let assetName = fileData.name.substr(f.path.length - type.length);
			let assetURL = gameURL + assetName;
			if(!type.startsWith('src')) {
				if(!assetsMap.has(assetURL)) {
					assetsMap.set(assetURL, fileData.name);
					fileData.name = assetName;
				} else {
					return false;
				}
			}
			return true;

		});
		ret[type] = ret[type].concat(a);
	}
	return ret;
}

const walkSync = (dir, fileList = []) => {
	fs.readdirSync(dir).forEach(file => {
		let stats = fs.statSync(path.join(dir, file));
		
		if(stats.isDirectory()) {
			fileList = walkSync(path.join(dir, file), fileList);
		} else if(stats.size > 0) {
			fileList.push({name: path.join(dir, file), mtime: stats.mtimeMs});
		}
	});
	return fileList;
};

//============= enum projects ===========================
const enumProjects = () => {
	let ret = [];
	let dir = path.join(__dirname, '..', gamesRoot);
	fs.readdirSync(dir).forEach(file => {
		let dirName = path.join(dir, file);
		if(fs.statSync(dirName).isDirectory()) {
			let projDescFile = dirName + '/thing-project.json';
			if(fs.existsSync(projDescFile)) {
				let desc = JSON.parse(fs.readFileSync(projDescFile, 'utf8'));
				desc.dir = file;
				ret.push(desc);
			}
		}
	});
	return ret;
};
//============= enum libs ===========================
const enumLibs = (ret = [], dir = '.') => {
	fs.readdirSync(dir).forEach(file => {
		let dirName = path.join(dir, file);
		if(fs.statSync(dirName).isDirectory()) {
			let libDescFile = path.join(dirName, '/thing-lib.json');
			if(fs.existsSync(libDescFile)) {
				let len = ret.length;
				enumLibs(ret, dirName);
				if(ret.length === len) {
					ret.push(dirName.replace(pathSeparatorReplaceExp, '/').replace('./',''));
				}
			}
		}
	});
	return ret;
};

//=============== create folder for file ==================
function ensureDirectoryExistence(filePath) {
	let dirname = path.dirname(filePath);
	if (fs.existsSync(dirname)) {
		return true;
	}
	ensureDirectoryExistence(dirname);
	fs.mkdirSync(dirname);
}

//=============== project's files changing watcher ================
const watchers = [];
let changedFiles = {};
let fileChangedTimeout;

const filterWatchFiles = /\.(json|png|wav|jpg|js)$/mg;
function initWatchers() {
	while(watchers.length) {
		watchers.pop().close();
	}
	let watchFolders = new Set();

	getDataFolders().some((assetsFolderData) => {
		let assetsFolder = ((assetsFolderData.type === 'i18n' ) ? currentGameDesc.localesPath : assetsFolderData.type) + '/';
		
		if(assetsFolderData.type === 'src/game-objects' || assetsFolderData.type ===  'src/scenes') {
			assetsFolderData.path = assetsFolderData.path.replace(/src(\\|\/)(game-objects|scenes)$/ ,'src');
			assetsFolder = 'src/';
		}
		if(watchFolders.has(assetsFolderData.path)) {
			return;
		}
		watchFolders.add(assetsFolderData.path);

		// log('watch: ' + assetsFolderData.path);

		let watcher = fs.watch(assetsFolderData.path, { recursive : true });
		watchers.push(watcher);
		watcher.on('change', (eventType, filename) => {
			filename = filename.replace(pathSeparatorReplaceExp, '/');
			// log('file changed event: ' + eventType + '; ' + filename);
			if(filename && filterWatchFiles.test(filename)) {

				let fullFileName = path.join(assetsFolderData.path, filename);
				filename = path.join(assetsFolder, filename);
				
				if(eventType === 'change' || eventType === 'rename') {
					if(fs.existsSync(fullFileName)) {
						try{
							let stats = fs.statSync(fullFileName);
							if(stats.isFile() && stats.size > 0) {
								fileChangeSchedule(filename, stats.mtime);
							}
						} catch (er) {
							//log("file change handler error: " + er); //for case if tmp file is not exist
						}
					} else {
						fileChangeSchedule(filename, 0, true);
					}
				}
			}
		});
	});
}

function fileChangeSchedule(name, mtime, deleted = false) {
	changedFiles[name] = {name, mtime, deleted};
	if(fileChangedTimeout) {
		clearTimeout(fileChangedTimeout);
	}
	fileChangedTimeout = setTimeout(filesChangedProcess, 500);
}

function filesChangedProcess() {
	fileChangedTimeout = null;
	let files = [];
	for(let fileName in changedFiles) {
		let s = changedFiles[fileName];
		pathSeparatorReplace(s);
		//log('file changed: ' + fileName);
		files.push(s);
	}
	wss.filesChanged(files);
	changedFiles = {};
}

//=============== vs-code integration ==================

function excludeAnotherProjectsFromCodeEditor() { // hides another projects from vs code
	let jsConfigFN = './jsconfig.json';
	let vsSettingsFn = './.vscode/settings.json';
	
	let dirsToExclude = enumProjects().filter(g => g.dir !== currentGame).map(p => 'games/' + p.dir).concat(enumLibs([]).filter(isLibNotInProject));

	for(let i = 0; i < 5; i++) {
		if(fs.existsSync(jsConfigFN)) {
			let jsConfig = JSON.parse(fs.readFileSync(jsConfigFN));
			let oldJsExcludes = jsConfig.exclude;
			let exclude = [];
			jsConfig.exclude = exclude;
			if(Array.isArray(oldJsExcludes)) {
				
				for(let k of oldJsExcludes) {
					if(!isLibInProject(k)) {
						exclude.push(k);
					}
				}
			}
			for(let dir of dirsToExclude) {
				if(!isLibInProject(dir) && (exclude.indexOf(dir) < 0)) {
					exclude.push(dir);
				}
			}
			fs.writeFileSync(jsConfigFN, JSON.stringify(jsConfig, undefined, '	'));
		}

		if(fs.existsSync(vsSettingsFn)) {
			let config = JSON.parse(fs.readFileSync(vsSettingsFn));
			let oldExcludes = config['files.exclude'];
			let exclude = {};
			config['files.exclude'] = exclude;
			if(oldExcludes) {
				for(let k in oldExcludes) {
					if(!isLibInProject(k.replace(/(^\*\*\/|\/\*\*$)/gm,''))) {
						exclude[k] = oldExcludes[k];
					}
				}
			}
			for(let dir of dirsToExclude) {
				exclude['**/' + dir + '/**'] = true;
			}
			fs.writeFileSync(vsSettingsFn, JSON.stringify(config, undefined, '	'));
			
		}
		
		jsConfigFN = '../' + jsConfigFN;
		vsSettingsFn = '../' + vsSettingsFn;
	}
}

function isLibNotInProject(libName) {
	return !isLibInProject(libName);
}

function isLibInProject(libName) {
	return (currentGameDesc.libs && (currentGameDesc.libs.indexOf(libName) >= 0)) || (libName === ('games/' + currentGame));
}

//=============== module importing fixer ==================

let moduleImportFixer = /(^\s*import.+from\s*['"][^'"]+)(['"])/gm;

let moduleImportAbsFixer = /(^\s*import.+from\s*['"])([^.\/])/gm;

function absoluteImportsFixer(fileName, req, res, next) {
	let needParse = req.path.endsWith('.js') && !req.path.endsWith('.min.js');
	if(needParse) {
		fs.readFile(fileName, function (err, content) {
			if (err) {
				log('JS PREPROCESSING ERROR: ' + err);
				next(err);
			} else {
				res.set('Content-Type', 'application/javascript');
				let resultJsContent = content.toString().replace(moduleImportAbsFixer, (substr, m1, m2) => {					
					return m1 + "/" + m2;
				});
				resultJsContent = addJsExtensionAndPreventCache(req, res, resultJsContent);
				return res.end(resultJsContent);
			}
		});
	} else {
		next();
	}
}

function addJsExtensionAndPreventCache(req, res, content) {
	let modulesVersion = req.query ? req.query.v : false;
	if(modulesVersion) {
		res.set('Content-Type', 'application/javascript');
		content = content.toString().replace(moduleImportFixer, (substr, m1, m2) => {
			if(!m1.toLowerCase().endsWith('.js')) {
				m1 += '.js';
			}
			if(m1.indexOf('thing-engine/js/') >= 0 || m1.indexOf('thing-editor/') >= 0) {
				return m1 + m2;
			}
			return m1 + '?v=' + modulesVersion + m2;
		});
	}
	return content;
}
