const log = console.log;
let bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const opn = require('opn');

const build = require('./scripts/build.js');

let currentGame;
let currentGameRoot;

let PORT = 32023;
let gamesRoot = __dirname + '/../games/';
let clientGamesRoot = '/games/';
let jsonParser = bodyParser.json({limit:1024*1024*200});

// File System acess commands

app.get('/fs/projects', function (req, res) {
	res.send(enumProjects());
});

app.get('/fs/openProject', function (req, res) {
	
	let folder = gamesRoot + req.query.dir + '/';
	
	if(fs.existsSync(folder) && fs.existsSync(folder+'thing-project.json')) {
		currentGame = req.query.dir;
		currentGameRoot = folder;
		process.chdir(currentGameRoot);
		log('Project opened: ' + currentGameRoot);
		res.send(fs.readFileSync('thing-project.json'));
	} else {
		log('Can\'t open project: ' + req.query.dir);
		res.send('false');
	}
});

let pathFixerExp = /\\/g;
let pathFixer = (fn) => {
    return fn.replace(pathFixerExp, '/');
};

app.get('/fs/enum', function (req, res) {
	if(!currentGame) throw 'No game opened';
	
	let list = walkSync('./img');
	walkSync('./prefabs', list);
	walkSync('./scenes', list);
	walkSync('./src', list);
	
	res.send(list.map(pathFixer));
});

app.get('/fs/delete', function (req, res) {
	if(!currentGame) throw 'No game opened';
	let fn = req.query.f;
	try {
		fs.unlinkSync(fn);
		res.end('{}');
	} catch (err) {
		res.end("Can't delete file: " + fn);
	}
});

app.get('/fs/edit', function (req, res) {
	if(!currentGame) throw 'No game opened';
	
	let fn = req.query.f;
	if(fn.indexOf('thing-engine/js/') >= 0) {
		fn = path.join(__dirname, '../', fn);
	} else {
		fn = path.resolve(currentGameRoot, fn);
	}
	setTimeout(() => {
		"use strict";
		try {
			opn(fn);
			res.end('{}');
		} catch (err) {
			res.end("Can't open file to edit: " + fn);
		}
	},100);

});

app.get('/fs/build', function (req, res) {
	log('BUILD project: ' + currentGameRoot);
	build(currentGameRoot, (result) => {
		res.end(JSON.stringify(result));
	});
});

app.post('/fs/savefile', jsonParser, function (req, res) {
	let fileName = req.body.filename;
	//log('Save file: ' + fileName);
    ensureDirectoryExistence(fileName);
	fs.writeFile(fileName, req.body.data, function(err) {
		if(err) {
			throw err;
		}
		res.end();
	});
});

// modules import cache preventing
let moduleImportFixer = /(^\s*import.+from\s*['"][^'"]+)(['"])/gm;

app.use('/games/', (req, res, next) => {
	//log("GAMES JS PREPROCESSING: " + req.path);
	
	let modulesVersion = req.query ? req.query.v : false;
	
	let needParse = modulesVersion && req.path.endsWith('.js');

	if(needParse) {
		let fileName = path.join(gamesRoot, req.path);
		fs.readFile(fileName, function (err, content) {
			if (err) {
				log('JS PREPROCESSING ERROR: ' + err);
				next(err);
			} else {
				res.set('Content-Type', 'application/javascript');
				let rendered = content.toString().replace(moduleImportFixer, (substr, m1, m2) => {
					if(m1.indexOf('thing-engine/js/') >= 0 || m1.indexOf('thing-editor/') >= 0) {
						return substr;
					}
					return m1 + '?v=' + modulesVersion + m2;
				});
				return res.end(rendered);
			}
		});
	} else {
		next();
	}

});

app.use('/games/', express.static(path.join(__dirname, '../games'), {dotfiles:'allow'}));
app.use('/thing-engine/', express.static(path.join(__dirname, '../thing-engine'), {dotfiles:'allow'}));
app.use('/thing-editor/', express.static(__dirname, {dotfiles:'allow'}));



app.get('/', function(req, res) {
	res.redirect('/thing-editor');
});

//========= start server ================================================================
let server = app.listen(PORT, () => log('Example app listening on port ' + PORT + '!'));

opn('', {app: ['chrome', /*--new-window --no-sandbox --js-flags="--max_old_space_size=32768"--app=*/ 'http://127.0.0.1:' + PORT + '/thing-editor']});

//======== socket connection with client ================================================
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: PORT + 1 });
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		//console.log('received: %s', message);
	});
	/*ws.on('close', function onWsClose(){
		log('Thing closing...');
		server.close();
		process.exit(0);
	});*/
	ws.send('something');
});

//=========== enum files ================================
const walkSync = (dir, filelist = []) => {
	fs.readdirSync(dir).forEach(file => {
		let stats = fs.statSync(path.join(dir, file));
		
		if(stats.isDirectory()) {
			filelist = walkSync(path.join(dir, file), filelist);
		} else if(stats.size > 0) {
			filelist.push(path.join(dir, file));
		}
	});
	return filelist;
};

//============= enum projects ===========================
const enumProjects = () => {
	let ret = [];
	let dir = gamesRoot;
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