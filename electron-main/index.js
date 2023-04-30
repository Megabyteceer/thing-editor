const {
	app,
	BrowserWindow,
	ipcMain,
	nativeTheme
} = require('electron');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

let devToolsWindow;

const path = require('path');

const fs = require('fs');
const ThingEditorWindow = require("./thing-editor-window.js");

const fsOptions = {
	encoding: 'utf8'
};

const createWindow = () => {
	let windowState = {
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	};

	const mainWindow = new ThingEditorWindow(windowState, 'main');
	mainWindow.on('close', () => {
		if(devToolsWindow) {
			devToolsWindow.close();
		}
	});
	nativeTheme.themeSource = 'dark'

	ipcMain.on('fs', (event, command, fileName, content) => {
		console.log('command fs: ' + command + ': ' + (fileName || ''));
		let fd;
		switch (command) {
			case 'fs/toggleDevTools':
				if(devToolsWindow) {
					if(devToolsWindow.isMaximized()) {
						devToolsWindow.minimize();
					} else {
						devToolsWindow.maximize();
					}
				}
				event.returnValue = true;
				return;
			case 'fs/saveFile':
				fd = fs.openSync(fileName, 'w');
				fs.writeSync(fd, content);
				fs.closeSync(fd, () => {});
				event.returnValue = true;
				return;
			case 'fs/readFile':
				fd = fs.openSync(fileName, 'r');
				let c = fs.readFileSync(fd, fsOptions);
				fs.closeSync(fd, () => {});
				event.returnValue = c;
				return;
			case 'fs/readDir':
				let files = fs.readdirSync(fileName);
				fileName += '/';
				event.returnValue = files.map((f) => {
					const name = fileName + f;
					const stats = fs.statSync(name);
					return {
						name,
						mTime: stats.mtimeMs
					}
				});
				return;
			case 'fs/frontend-ready':
				setTimeout(loadEditorIndexHTML, 300);
				event.returnValue = true;
		}
	});

	const loadEditorIndexHTML = () => {
		mainWindow.loadURL('http://127.0.0.1:5173/');
		//mainWindow.loadFile('../index.html');
	};

	if (process.argv.indexOf('debugger-detection-await') >= 0) {
		mainWindow.loadURL('http://127.0.0.1:5173/debugger-awaiter.html');

		devToolsWindow = new ThingEditorWindow({}, 'devtools');
		mainWindow.webContents.setDevToolsWebContents(devToolsWindow.webContents);
		mainWindow.webContents.openDevTools({
			mode: "detach"
		});
		devToolsWindow.addListener('closed', () => {
			devToolsWindow = null;
		});
		devToolsWindow.maximize();
		devToolsWindow.minimize();
		devToolsWindow.setTitle('Thing-Editor DevTools')

	} else {
		loadEditorIndexHTML();
	}
};

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow()
	})
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
});