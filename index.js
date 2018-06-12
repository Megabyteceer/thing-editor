const log = console.log;
var bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const build = require('./scripts/build.js');

var currentGame;
var currentGameRoot;

var PORT = 32023;
var gamesRoot = __dirname + '/../games/';
var clientGamesRoot = '/games/';
var jsonParser = bodyParser.json({limit:1024*1024*200});

// File System acess commands

app.get('/fs/projects', function (req, res) {
	res.send(enumProjects());
});

app.get('/fs/openProject', function (req, res) {
	currentGame = req.query.dir;
	currentGameRoot = gamesRoot + currentGame + '/';
	process.chdir(gamesRoot + currentGame);
	log('Project opened: ' + currentGameRoot + '; ' + process.cwd());
	res.send(fs.readFileSync('thing-project.json'));
});

var pathFixerExp = /\\/g;
var pathFixer = (fn) => {
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
	var fn = req.query.f;
	try {
		fs.unlinkSync(fn);
		res.end('{}');
	} catch (err) {
		res.end("Can't delete file " + fn);
	}
});

app.get('/fs/build', function (req, res) {
	log('BUILD project: ' + currentGameRoot);
	build(currentGameRoot, (result) => {
		res.end(JSON.stringify(result));
	});
});

app.post('/fs/savefile', jsonParser, function (req, res) {
	var fileName = req.body.filename;
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
var moduleImportFixer = /(^\s*import.+from\s*['"][^'"]+)(['"])/gm;

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
				var rendered = content.toString().replace(moduleImportFixer, '$1?v=' + modulesVersion + '$2');
				return res.end(rendered);
			}
		});
	} else {
		next();
	}

});

app.use('/games/', express.static(path.join(__dirname, '../games'), {dotfiles:'allow'}));
app.use('/engine/', express.static(path.join(__dirname, '../engine/public'), {dotfiles:'allow'}));
app.use('/editor/', express.static(path.join(__dirname, '../editor/public'), {dotfiles:'allow'}));

//========= start server ================================================================
var server = app.listen(PORT, () => log('Example app listening on port ' + PORT + '!'));

const opn = require('opn');
opn('', {app: ['chrome', /*'--new-window --no-sandbox --js-flags="--max_old_space_size=32768"--app=*/ 'http://127.0.0.1:' + PORT + '/editor']});

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
	var ret = [];
	var dir = gamesRoot;
	fs.readdirSync(dir).forEach(file => {
		var dirName = path.join(dir, file);
		if(fs.statSync(dirName).isDirectory()) {
			var projDescFile = dirName + '/thing-project.json';
			if(fs.existsSync(projDescFile)) {
				var desc = JSON.parse(fs.readFileSync(projDescFile, 'utf8'));
				desc.dir = file;
				ret.push(desc);
			}
		}
	});
	return ret;
};

//=============== create folder for file ==================
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}