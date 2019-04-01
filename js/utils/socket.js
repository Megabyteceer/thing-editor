const ws = new WebSocket('ws://' + location.hostname + ':' + (parseInt(location.port) + 1));

ws.onopen = function open() {
	ws.send('something');
};

ws.onmessage = function incoming(data) {
	data = JSON.parse(data.data);
	if(data.hasOwnProperty('clientsConnected') && data.clientsConnected !== 1) {
		editor.ui.modal.showFatalError('Thing-editor already launched.', '');
		ws.onclose = undefined;
	} else {
		editor.onServerAllowsWorking();
	}
	if(data.hasOwnProperty('notifyText')) {
		editor.ui.modal.notify(data.notifyText);
	}
	
};

ws.onclose = function incoming() {
	closeWindow();
};

function closeWindow() {
	editor.ui.modal.showFatalError("Page can be closed now.", '');
}

export default ws;