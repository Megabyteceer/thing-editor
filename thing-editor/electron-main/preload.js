const {
	contextBridge,
	ipcRenderer
} = require('electron');

contextBridge.exposeInMainWorld(
	'electron_ThingEditorServer',
	{
		'versions': {
			node: process.versions.node,
			chrome: process.versions.chrome,
			electron: process.versions.electron
		},
		fs: (command, fileName, content, ...args) => {
			return ipcRenderer.sendSync('fs', command, fileName, content, ...args);
		},
		fsAsync: (command, fileName, content, ...args) => {
			return ipcRenderer.invoke('fs', command, fileName, content, ...args);
		},
		onServerMessage: (_onServerMessage) => {
			ipcRenderer.on('serverMessage', _onServerMessage);
		}
	}
);

