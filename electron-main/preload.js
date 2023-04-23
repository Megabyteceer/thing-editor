const {
	contextBridge,
	ipcRenderer
} = require('electron')

contextBridge.exposeInMainWorld(
	'thingEditorServer', {
		fs: (command, fileName, content) => {
			return ipcRenderer.sendSync('fs', command, fileName, content);
		}
	}
)
