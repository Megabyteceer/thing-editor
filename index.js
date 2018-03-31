const log = console.log;
log('Thing starting...');

const fs = require('fs');
const path = require('path')
const express = require('express')
const app = express()

var PORT = 32023;

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
		console.log('received: %s', message);
	});
	/*ws.on('close', function onWsClose(){
		log('Thing closing...');
		server.close();
		process.exit(0);
	});*/
	ws.send('something');
});