const log = console.log;
log('Thing starting...');

const fs = require('fs');
const path = require('path')
const express = require('express')
const app = express()
const ef = () => {};
const rootPath = path.resolve(__dirname)+'/';

var PORT = 32023;

app.use('/', express.static(path.join(__dirname, 'public')));

//========= libs reflection to public ===================================================
var clientJsLibs = {
	'react-dom.development.js': 'node_modules/react-dom/umd/react-dom.development.js',
	'react.development.js': 'node_modules/react/umd/react.development.js',
	'jquery.min.js': 'node_modules/jquery/dist/jquery.min.js',
	'pixi.min.js': 'node_modules/pixi.js/dist/pixi.min.js'
};
createSymlink(rootPath + 'node_modules/reset-css/reset.css', 'public/css/reset.css');

var libsFolder = rootPath + 'public/js/lib/';
if (!fs.existsSync(libsFolder)) {
    fs.mkdirSync(libsFolder);
}
function createSymlink(src, dest) {
	if(fs.existsSync(src)) {
		fs.symlink(src, dest, ef);
	}
}
Object.keys(clientJsLibs).some((k) => {
	var src = rootPath + clientJsLibs[k];
	var dest = libsFolder + k;
	createSymlink(src, dest);
});

//========= start server ================================================================
var server = app.listen(PORT, () => log('Example app listening on port ' + PORT + '!'));

const opn = require('opn');
opn('', {app: ['chrome', /*'--new-window --app=' +*/ 'http://127.0.0.1:' + PORT]});

//======== socket connection with client ================================================
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: PORT + 1 });
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		console.log('received: %s', message);
	});
	/*ws.on('close', function onWsClose(){
		log('Thing closing...');
		server.close();
		process.exit(0);
	});*/
	ws.send('something');
});