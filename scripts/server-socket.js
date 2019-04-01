/*global require */
/*global module */

let PORT = 32024;

const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: PORT });
let clientsConnected = 0;
let clicentSocket;
wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(/*message*/) {
		//console.log('received: %s', message);
	});
	ws.on('close', function onWsClose(){
		clientsConnected--;
	});
	clientsConnected++;
	ws.send(JSON.stringify({clientsConnected}));
	if(clientsConnected > 1) {
		ws.close();
	} else {
		clicentSocket = ws;
	}
});


module.exports = {
	notify: function notify(notifyText) {
		clicentSocket.send(JSON.stringify({notifyText}));
	}
};