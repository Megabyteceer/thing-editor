const log = console.log;
log('Thing starting...');

const fs = require('fs');
const path = require('path')
const express = require('express')
const app = express()

var currentGame;

var PORT = 32023;
var gamesRoot = __dirname + '/public/games/';

app.use('/fs/projects', function (req, res) {
	res.send(enumProjects());
});
app.use('/fs/openProject', function (req, res) {
	currentGame = req.query.dir;
	process.chdir(gamesRoot + currentGame);
	res.send({});
});
app.use('/fs/enum', function (req, res) {
	if(!currentGame) throw 'No game opened';
	res.send(walkSync('.'));
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


