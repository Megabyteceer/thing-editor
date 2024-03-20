const {
	app,
	BrowserWindow,
	nativeTheme,
	dialog,
	globalShortcut,
	shell
} = require('electron');

const originalLog = console.log.bind(console);

console.log = (txt) => {
	try {
		originalLog(txt);
	} catch(er) { } // eslint-disable-line no-empty
};

const IS_DEBUG = process.argv.indexOf('debugger-detection-await') >= 0;

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/** @type BrowserWindow */
let mainWindow;

const path = require('path');

const PositionRestoreWindow = require("./thing-editor-window.js");
const {exec} = require("child_process");

process.on('unhandledRejection', function (err) {
	dialog.showErrorBox('Thing-editor back-end error.', err.stack || err.message || err);
});

process.on('uncaughtException', function (err) {
	dialog.showErrorBox('Thing-editor back-end error.', err.stack || err.message || err);
});

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
	mainWindow.webContents.setWindowOpenHandler((event) => {
		shell.openExternal(event.url);
		return {action: "deny"};
	});

	mainWindow.on('focus', () => {
		globalShortcut.register('F5', () => {
			mainWindow.reload();
		});
		globalShortcut.register('F12', () => { // On windows set HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AeDebug\UserDebuggerHotKey to '2f' value to make F12 it work
			mainWindow.webContents.openDevTools();
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

	nativeTheme.themeSource = 'dark';


	require('./pixi-typings-patch.js')(mainWindow);

	require('./server-fs.js')(mainWindow);

	const EDITOR_VITE_ROOT = 'http://localhost:5173/thing-editor/';
	const loadEditorIndexHTML = () => {
		mainWindow.setOpacity(1);
		mainWindow.loadURL(EDITOR_VITE_ROOT);
	};

	if(IS_DEBUG) {

		//let debuggerDetector = require('./debugger-detection');
		mainWindow.loadURL('http://localhost:5173/thing-editor/debugger-awaiter.html').catch((er) => {
			mainWindow.setOpacity(1);
			if(er.code === 'ERR_CONNECTION_REFUSED') {
				dialog.showErrorBox('Thing-editor startup error.', 'Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
			}
		});
		setTimeout(loadEditorIndexHTML, 600);
	} else {
		loadEditorIndexHTML();
	}
};

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if(BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	console.log('thing-editor exit');
	if(process.platform !== 'darwin') app.quit();
});

exec("git update-index --assume-unchanged thing-editor.code-workspace tsconfig.json thing-editor/src/editor/current-scene-typings.d.ts thing-editor/src/editor/prefabs-typing.ts", {cwd: __dirname + '/../..'});