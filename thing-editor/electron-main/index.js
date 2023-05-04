const {
	app,
	BrowserWindow,
	ipcMain,
	nativeTheme,
	dialog
} = require('electron');

const IS_DEBUG = process.argv.indexOf('debugger-detection-await');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/** @type BrowserWindow */
let mainWindow;

const path = require('path');

const fs = require('fs');
const PositionRestoreWindow = require("./thing-editor-window.js");
const {
	walkSync
} = require("./editor-server-utils.js");

const fsOptions = {
	encoding: 'utf8'
};

const createWindow = () => {
	/** @type BrowserWindowConstructorOptions */
	let windowState;
	windowState = {
		webPreferences: {
			preload: path.join(__dirname, 'preload.js')
		}
	};

	mainWindow = new PositionRestoreWindow(windowState, 'main');

	nativeTheme.themeSource = 'dark'

	ipcMain.on('fs', (event, command, fileName, content) => {
		console.log('command fs: ' + command + ': ' + (fileName || ''));
		let fd;
		switch(command) {
			case 'fs/toggleDevTools':
				mainWindow.webContents.toggleDevTools();
				event.returnValue = true;
				return;
			case 'fs/delete':
				fs.unlinkSync(fileName);
				event.returnValue = true;
				return;
			case 'fs/saveFile':
				fd = fs.openSync(fileName, 'w');
				fs.writeSync(fd, content);
				fs.closeSync(fd, () => { });
				event.returnValue = true;
				return;
			case '/fs/editFile':
				const open = require('open');
				open(fn);
				if(line && fs.lstatSync(fn).isFile()) {
					let arg = fn + ':' + line + (char ? ':' + char : '');
					open('', {
						app: ['code', '-r', '-g', arg]
					});
				}
				event.returnValue = true;
				return;
			case 'fs/readFile':
				fd = fs.openSync(fileName, 'r');
				let c = fs.readFileSync(fd, fsOptions);
				fs.closeSync(fd, () => { });
				event.returnValue = c;
				return;
			case 'fs/readDir':
				event.returnValue = walkSync(fileName, []);
				return;
			case 'fs/frontend-ready':
				setTimeout(loadEditorIndexHTML, 300);
				event.returnValue = true;
		}
	});

	require('./pixi-typings-patch.js')();

	const loadEditorIndexHTML = () => {
		const EDITOR_VITE_ROOT = 'http://127.0.0.1:5173/thing-editor/';
		mainWindow.loadURL(EDITOR_VITE_ROOT).catch(() => {
			dialog.showErrorBox('Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
		});
	};

	if(IS_DEBUG) {
		mainWindow.loadURL('http://127.0.0.1:5173/thing-editor/debugger-awaiter.html');
	} else {
		loadEditorIndexHTML();
	}
};

app.whenReady().then(() => {
	createWindow()

	app.on('activate', () => {
		if(BrowserWindow.getAllWindows().length === 0) createWindow()
	})
});

app.on('window-all-closed', () => {
	if(process.platform !== 'darwin') app.quit()
});