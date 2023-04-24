const DEBUG_PORT_ARG = '--remote-debugging-port=';
let debugPortArg = process.argv.find(a => a.startsWith(DEBUG_PORT_ARG));
let newProxy;
if(debugPortArg) {
	var proxy = require("node-tcp-proxy");
	var servicePort = parseInt(debugPortArg.replace(DEBUG_PORT_ARG, ''));

	newProxy = proxy.createProxy(servicePort + 1, "127.0.0.1", servicePort/*, {
		upstream: function(context, data) {
			console.log('UP: ' + data.toString());
			return data;
		},
		downstream: function(context, data) {
			console.log('DOWN: ' + data.toString());
			return data;
		}
	}*/);
}

module.exports = newProxy.server;