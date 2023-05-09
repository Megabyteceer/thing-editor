const DEBUG_PORT_ARG = '--remote-debugging-port=';
module.exports = null;

const EventEmitter = require('events');

let flags = 0;
let connections = 0;

let debugPortArg = process.argv.find(a => a.startsWith(DEBUG_PORT_ARG));
if(debugPortArg) {
	var proxy = require("node-tcp-proxy");
	var servicePort = parseInt(debugPortArg.replace(DEBUG_PORT_ARG, ''));
	var eventEmitter = new EventEmitter();

	console.log('debugger detector waits: ' + servicePort);
	proxy.createProxy(servicePort + 1, "127.0.0.1", servicePort, {
		downstream: (context, data) => {
			if(connections === 2) {
				flags |= 1;
				if(flags === 3) {
					eventEmitter.emit('debugger-ready');
				}
			}
			return data;
		},
		upstream: (context, data) => {
			if(connections === 2) {
				flags |= 2;
				if(flags === 3) {
					eventEmitter.emit('debugger-ready');
				}
			}
			return data;
		},
		serviceHostSelected: function (proxySocket, i) {
			connections++;
			return i;
		}
	});
	module.exports = eventEmitter;
}


