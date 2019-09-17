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

//========= File System acess commands ====================

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
		exludeAnotherProjectsFromCodeEditor();

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
		res.end('{"error": "Can not delete file: ' + fn + '"}');
	}
});

app.get('/fs/edit', function (req, res) {
	if(!currentGame) throw 'No game opened';
	
	let fn = req.query.f;
	if(fn.indexOf('thing-engine/js/') >= 0) {
		fn = path.join(__dirname, '../', fn);
	} else {
		fn = path.join(__dirname, '..', fn);
	}
	setTimeout(() => {
		"use strict";
		try {
			open(fn);
			res.end('{}');
		} catch (err) {
			res.end("Can't open file to edit: " + fn);
		}
	},100);

});

app.post('/fs/fetch', jsonParser, function (req, res) {


	let fetch = require('node-fetch');
	fetch(req.body.url, req.body.options).then((rsponce) => rsponce.text())
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
	exec('node "' +
	path.resolve(__dirname, 'scripts/build.js') + '" "' +
	currentGameRoot+'" ' + 
	(req.query.debug ? 'debug' : ''),
	{maxBuffer: 1024 * 5000},
	(err, stdout, errout) => {
		log(errout);
		if(errout instanceof Buffer) {
			errout = errout.toString();
		}
		if(stdout instanceof Buffer) {
			stdout = stdout.toString();
		}
		let ret = stdout.split('\n').concat(errout.split('\n'));
		if(err) {
			ret.unshift('ERROR: ' + JSON.stringify(err));
		}
		res.end(JSON.stringify(ret));
	});
});

app.post('/fs/build-sounds', jsonParser, function (req, res) {
	log('BUILD sounds: ' + currentGameRoot);

	buildSounds(currentGameRoot,
		function (result) {
			res.end(JSON.stringify(result));
		},
		req.body
	);
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
	absoluteImportsFixer(path.join(__dirname, '..', req.path), req, res, next);
});

app.use('/games/',  (req, res) => {
	res.sendFile(path.join(fullRoot, mapAssetUrl(req.path)));
});

app.use('/', express.static(path.join(__dirname, '../'), {dotfiles:'allow'}));

function mapFileUrl(url) {
	return mapAssetUrl('/' + currentGame + '/' + url);
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
			let libRootFolder = path.join(__dirname, '..', libName);
			if(fs.existsSync(libRootFolder)) {
				for(let type of ASSETS_FOLDERS_NAMES) {
					let assetsFolder = path.join(libRootFolder, type);
					log("CHECK FOLDER: " + assetsFolder);
					if(fs.existsSync(assetsFolder)) {
						ret.push({
							type,
							path: path.join(libName, type)
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
		
		walkSync(f.path, a);
		a = a.filter((fileData) => {
			pathSeparatorReplace(fileData);


			let assetName = fileData.name.substr(f.path.length - type.length);
			let assetURL = gameURL + assetName;
			if(!type.startsWith('src')) {
				if(!assetsMap.has(assetURL)) {
					assetsMap.set(assetURL, fileData.name);
					log('MAP: ' + assetURL + ' => '+ fileData.name);
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

const walkSync = (dir, filelist = []) => {
	fs.readdirSync(dir).forEach(file => {
		let stats = fs.statSync(path.join(dir, file));
		
		if(stats.isDirectory()) {
			filelist = walkSync(path.join(dir, file), filelist);
		} else if(stats.size > 0) {
			filelist.push({name: path.join(dir, file), mtime: stats.mtimeMs});
		}
	});
	return filelist;
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

//=============== create folder for file ==================
function ensureDirectoryExistence(filePath) {
	let dirname = path.dirname(filePath);
	if (fs.existsSync(dirname)) {
		return true;
	}
	ensureDirectoryExistence(dirname);
	fs.mkdirSync(dirname);
}

//=============== project's files changin watcher ================
const watchers = [];
let changedFiles = {};
let filechangedTimeout;

const filterWatchFiles = /.(json|png|wav|jpg)$/mg;
function initWatchers() {
	while(watchers.length) {
		watchers.pop().close();
	}
	getDataFolders().some((assetsFolderData) => {
		if((assetsFolderData.type !== 'img') && (assetsFolderData.type !== 'snd')) {
			return;
		}
		let assetsFolder = assetsFolderData.path;
		let watcher = fs.watch(assetsFolder, { recursive : true });
		assetsFolder = assetsFolder + '/';
		watchers.push(watcher);
		watcher.on('change', (eventType, filename) => {
			//log('file changed event: ' + eventType + '; ' + filename);
			if(filename && filterWatchFiles.test(filename)) {
				filename = assetsFolder + filename.replace(pathSeparatorReplaceExp, '/');
				
				if(eventType === 'change' || eventType === 'rename') {
					if(fs.existsSync(filename)) {
						try{
							let stats = fs.statSync(filename);
							if(stats.isFile() && stats.size > 0) {
								fileChangeShedule(filename, stats.mtime);
							}
						} catch (er) {
							//log("file change handler error: " + er); //for case if tmp file is not exist
						}
					} else {
						fileChangeShedule(filename, 0, true);
					}
				}
			}
		});
	});
}

function fileChangeShedule(name, mtime, deleted = false) {
	changedFiles[name] = {name, mtime, deleted};
	if(filechangedTimeout) {
		clearTimeout(filechangedTimeout);
	}
	filechangedTimeout = setTimeout(filesChangedProcess, 500);
}

function filesChangedProcess() {
	filechangedTimeout = null;
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

function exludeAnotherProjectsFromCodeEditor() { // hides another projects from vs code
	let jsConfigFN = '../jsconfig.json';
	let vsSettingsFn = '../.vscode/settings.json';
	let projectsDirs = enumProjects().map(p => p.dir);
	for(let i = 0; i < 5; i++) {
		if(fs.existsSync(jsConfigFN)) {
			let jsConfig = JSON.parse(fs.readFileSync(jsConfigFN));
			let oldJsExcludes = jsConfig.exclude;
			let exclude = [];
			jsConfig.exclude = exclude;
			if(Array.isArray(oldJsExcludes)) {
				
				for(let k of oldJsExcludes) {
					if(projectsDirs.indexOf(k.replace(/^games\//, '')) < 0) {
						jsConfig.exclude.push(k);
					}
				}
			}
			for(let dir of projectsDirs) {
				if(dir !== currentGame) {
					jsConfig.exclude.push('games/' + dir);
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
					if(!projectsDirs.find((d) => {
						return k.indexOf('games/' + d) >= 0;
					})) {
						exclude[k] = oldExcludes[k];
					}
				}
			}
			for(let dir of projectsDirs) {
				if(dir !== currentGame) {
					exclude['**/games/' + dir + '/**'] = true;
				}
			}
			fs.writeFileSync(vsSettingsFn, JSON.stringify(config, undefined, '	'));
			
		}
		
		jsConfigFN = '../' + jsConfigFN;
		vsSettingsFn = '../' + vsSettingsFn;
	}
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
