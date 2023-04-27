const DEBUG_PORT_ARG = '--remote-debugging-port=';
module.exports = null;

const EventEmitter = require('events');

if(process.argv.indexOf('debugger-detection-await') >= 0) {
	let debugPortArg = process.argv.find(a => a.startsWith(DEBUG_PORT_ARG));
	let newProxy;
	if(debugPortArg) {
		var proxy = require("node-tcp-proxy");
		var servicePort = parseInt(debugPortArg.replace(DEBUG_PORT_ARG, ''));
		var eventEmitter = new EventEmitter();
		newProxy = proxy.createProxy(servicePort + 1, "127.0.0.1", servicePort, {
			downstream: function(context, data) {
				eventEmitter.emit('debugger-ready');
				return data;
			}
		});
		module.exports = eventEmitter;
	}
}

