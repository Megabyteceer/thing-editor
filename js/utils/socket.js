/*global window */

const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
	ws.send('something');
};

ws.onmessage = function incoming() {

};

ws.onclose = function incoming() {
	window.close();
};

export default ws;