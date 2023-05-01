const {
	contextBridge,
	ipcRenderer
} = require('electron')

contextBridge.exposeInMainWorld(
	'thingEditorServer', {
	'versions': {
		node: process.versions.node,
		chrome: process.versions.chrome,
		electron: process.versions.electron
	},
	fs: (command, fileName, content) => {
		return ipcRenderer.sendSync('fs', command, fileName, content);
	}
}
)