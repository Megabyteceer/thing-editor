const {
	contextBridge,
	ipcRenderer
} = require('electron')

contextBridge.exposeInMainWorld(
	'thingEditorServer',
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
			ipcRenderer.send('fs', command, fileName, content, ...args);
		},
		onServerMessage: (onServerMessage) => {
			ipcRenderer.on('serverMessage', onServerMessage);
		},
		argv: process.argv
	}
)