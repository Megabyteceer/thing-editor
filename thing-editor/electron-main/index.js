const {
	app,
	BrowserWindow,
	nativeTheme,
	dialog,
	globalShortcut
} = require('electron');

const IS_DEBUG = process.argv.indexOf('debugger-detection-await') >= 0;

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/** @type BrowserWindow */
let mainWindow;

const path = require('path');

const PositionRestoreWindow = require("./thing-editor-window.js");


const createWindow = () => {
	/** @type BrowserWindowConstructorOptions */
	let windowState;
	windowState = {
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			additionalArguments: [
				"--remote-debugging-port=9223",
				//"--wait-for-debugger"
			],
			webSecurity: false
		},
		icon: './thing-editor/img/favicon.ico',
		//opacity: 0
	};

	mainWindow = new PositionRestoreWindow(windowState, 'main');
	mainWindow.setMenu(null);
	/*mainWindow.addListener('close', (e) => {
		mainWindow.reload();
		e.preventDefault();
	});
*/
	mainWindow.on('focus', () => {
		globalShortcut.register('F5', () => {
			mainWindow.reload();
		});
		globalShortcut.register('F12', () => { // On windows set HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AeDebug\UserDebuggerHotKey to '2f' value to make F12 it work
			mainWindow.webContents.toggleDevTools();
		});
	});
	mainWindow.on('blur', () => {
		globalShortcut.unregisterAll();
	});


	//mainWindow.webContents.openDevTools();
	//mainWindow.hide();

	/*
	mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
		console.log(message + " " + sourceId + " (" + line + ")");
	});*/

	nativeTheme.themeSource = 'dark'


	require('./pixi-typings-patch.js')(mainWindow);

	require('./server-fs.js')(mainWindow);

	const loadEditorIndexHTML = () => {
		const EDITOR_VITE_ROOT = 'http://127.0.0.1:5173/thing-editor/';
		mainWindow.setOpacity(1);
		mainWindow.loadURL(EDITOR_VITE_ROOT);
	};

	if(IS_DEBUG) {

		//let debuggerDetector = require('./debugger-detection');
		mainWindow.loadURL('http://127.0.0.1:5173/thing-editor/debugger-awaiter.html').catch((er) => {
			mainWindow.setOpacity(1);
			if(er.code === 'ERR_CONNECTION_REFUSED') {
				dialog.showErrorBox(mainWindow, 'Thing-editor startup error.', 'Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
			}
		});
		setTimeout(loadEditorIndexHTML, 600);
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
	console.log('thing-editor exit');
	if(process.platform !== 'darwin') app.quit()
});
