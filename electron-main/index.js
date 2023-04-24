const {
	app,
	BrowserWindow,
	ipcMain
} = require('electron');

const path = require('path');
const appConfig = require('electron-settings');
const fs = require('fs');

const fsOptions = {
	encoding: 'utf8'
};

const createWindow = () => {
	let windowState;
	if (appConfig.has("windowPosition")) {
		windowState = appConfig.getSync("windowPosition");
	} else {
		windowState = {};
	}
	windowState.webPreferences = {
		preload: path.join(__dirname, 'preload.js')
	};

	const mainWindow = new BrowserWindow(windowState);
	if (windowState.isMaximized) {
		mainWindow.maximize();
	}

	const saveWindowPos = (ev) => {
		let windowState = mainWindow.getBounds();
		windowState.isMaximized = mainWindow.isMaximized();
		appConfig.set("windowPosition", windowState);
	};
	mainWindow.on("moved", saveWindowPos);
	mainWindow.on("maximize", saveWindowPos);
	mainWindow.on("resized", saveWindowPos);
	//mainWindow.webContents.openDevTools();

	ipcMain.on('fs', (event, command, fileName, content) => {
		console.log('command fs: ' + command + ': ' + fileName);
		let fd;
		switch (command) {
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
		}
	});

	const loadEditorIndexHTML = () => {
		mainWindow.loadURL('http://127.0.0.1:5173/');
		//mainWindow.loadFile('../index.html');
	};
	let debuggerDetector = require('./debugger-detection');
	if(debuggerDetector) {
		mainWindow.loadURL('http://127.0.0.1:5173/debugger-awaiter.html');
		debuggerDetector.once('connection', () => { setTimeout(loadEditorIndexHTML, 20);});
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