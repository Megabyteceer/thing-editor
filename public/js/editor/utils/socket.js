"use strict";

const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
  ws.send('something');
};

ws.onmessage = function incoming(data) {
  
};

ws.onclose = function incoming(data) {
  window.close();
};

export default ws;