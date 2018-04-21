const log = console.log;
var bodyParser = require('body-parser')
const fs = require('fs');
const path = require('path')
const express = require('express')
const app = express()
var cacheCounter = 0;

var currentGame;
var currentGameRoot;

var PORT = 32023;
var gamesRoot = __dirname + '/public/games/';
var clientGamesRoot = '/games/';
var jsonParser = bodyParser.json()

// File System acess commands

app.get('/fs/projects', function (req, res) {
	res.send(enumProjects());
});
app.get('/fs/openProject', function (req, res) {
	currentGame = req.query.dir;
	currentGameRoot = clientGamesRoot + currentGame + '/';
	process.chdir(gamesRoot + currentGame);
	//log('Project opened: ' + process.cwd());
	res.send(fs.readFileSync('project.json'));
});
var pathFixerExp = /\\/g;
var pathFixer = (fn) => {
    return fn.replace(pathFixerExp, '/');
}
app.get('/fs/enum', function (req, res) {
	if(!currentGame) throw 'No game opened';
	res.send(walkSync('.').map(pathFixer));
});
app.post('/fs/savefile', jsonParser, function (req, res) {
	var fileName = req.body.filename;
	log('Save file: ' + fileName);
    ensureDirectoryExistence(fileName);
	fs.writeFile(fileName, req.body.data, function(err) {
		if(err) {
			throw err;
		}
		res.end();
	});
});
app.get('/fs/loadClass', function (req, res) {
	var classPath = req.query.c;
	res.setHeader('Content-Type', 'application/javascript');
	res.send("import C from '" + currentGameRoot + classPath + "?nocache=" + (cacheCounter++) + "'; EDITOR.ClassesLoader.classLoaded(C, '" + classPath + "');");
});

app.use('/', express.static(path.join(__dirname, 'public')));

//========= start server ================================================================
var server = app.listen(PORT, () => log('Example app listening on port ' + PORT + '!'));

const opn = require('opn');
opn('', {app: ['chrome', /*'--new-window --app=' +*/ 'http://127.0.0.1:' + PORT]});

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

    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));

  });
  return filelist;
}

//============= enum projects ===========================
const enumProjects = () => {
	var ret = [];
	var dir = gamesRoot;
	fs.readdirSync(dir).forEach(file => {
		var dirName = path.join(dir, file);
		if(fs.statSync(dirName).isDirectory()) {
			var projDescFile = dirName + '/project.json';
			if(fs.existsSync(projDescFile)) {
				var desc = JSON.parse(fs.readFileSync(projDescFile, 'utf8'));
				desc.dir = file;
				ret.push(desc);
			}
		}
	});
	return ret;
}

//=============== create folder for fail ==================
function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

