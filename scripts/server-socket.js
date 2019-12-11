/*global require */
/*global module */

let PORT = 32024;

let spinnerShown = 0;

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
		clicentSocket = null;
	});
	clientsConnected++;
	ws.send(JSON.stringify({clientsConnected}));
	if(clientsConnected > 1) {
		ws.close();
	} else {
		clicentSocket = ws;
	}

	for(let i = 0; i < spinnerShown; i++) {
		module.exports.showSpinner(true);
	}
});


function send(data) {
	if(clicentSocket) {
		clicentSocket.send(JSON.stringify(data));
	}
}

module.exports = {
	notify: function notify(notifyText) {
		send({notifyText});
	},
	filesChanged: function(filesChanged) {
		send({filesChanged});
	},
	showSpinner: function(isReshow) {
		if(!isReshow) {
			spinnerShown++;
		}
		send({showSpinner: true});
	},
	hideSpinner: function() {
		spinnerShown--;
		send({hideSpinner: true});
	}
};