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
	} catch (_er) { }
};

const IS_DEBUG = process.argv.indexOf('debugger-detection-await') >= 0;

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

/** @type BrowserWindow */
let mainWindow;

const path = require('path');
const os = require('os');

const getPositionRestoreWindow = require('./thing-editor-window.js');
const {exec} = require('child_process');

process.on('unhandledRejection', function (err) {
	console.error(err.stack || err.message || err);
	dialog.showErrorBox('Thing-editor back-end error.', err.stack || err.message || err);
});

process.on('uncaughtException', function (err) {
	console.error(err.stack || err.message || err);
	dialog.showErrorBox('Thing-editor back-end error.', err.stack || err.message || err);
});

const createWindow = () => {
	/** @type BrowserWindowConstructorOptions */
	let windowState;
	windowState = {
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			additionalArguments: [
				'--js-flags="--max_old_space_size=8192',
				'--disable-dev-shm-usage',
				'--disable-gpu',
				'--user-data-dir=' + path.join(os.tmpdir(), 'chrome-user-tmp-data'),
				'--remote-debugging-port=9223',
				//"--wait-for-debugger"
			],
			webSecurity: false
		},
		icon: './thing-editor/img/favicon.ico',
		//opacity: 0
	};

	mainWindow = getPositionRestoreWindow(windowState, 'main');

	mainWindow.setMenu(null);
	mainWindow.webContents.setWindowOpenHandler((event) => {
		shell.openExternal(event.url);
		return {action: 'deny'};
	});

	mainWindow.webContents.addListener('console-message', (_event, _level, message, line, sourceId) =>{
		console.log('console-message:');
		console.log(message);
		console.log(sourceId);
		console.log(line);
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

	const EDITOR_VITE_ROOT = 'http://127.0.0.1:5173/thing-editor/';
	const loadEditorIndexHTML = () => {
		mainWindow.setOpacity(1);
		mainWindow.loadURL(EDITOR_VITE_ROOT);
	};

	if (IS_DEBUG) {

		//let debuggerDetector = require('./debugger-detection');
		mainWindow.loadURL('http://127.0.0.1:5173/thing-editor/debugger-awaiter.html').catch((er) => {
			mainWindow.setOpacity(1);
			if (er.code === 'ERR_CONNECTION_REFUSED') {
				console.error('Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
				dialog.showErrorBox('Thing-editor startup error.', 'Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
			}
		});
		setTimeout(loadEditorIndexHTML, 600);
		setTimeout(() => {
			mainWindow.capturePage((img) => {
				fs.writeFile(path.join(process.cwd(), '1.png'), img.toPng(), () =>{
					console.log('Saved 1.png');
				});
			});

		}, 3000);
	} else {
		loadEditorIndexHTML();
	}
};

app.whenReady().then(() => {
	createWindow();

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on('window-all-closed', () => {
	console.log('thing-editor exit');
	app.quit();
});

exec('git update-index --assume-unchanged thing-editor.code-workspace tsconfig.json thing-editor/src/editor/current-scene-typings.d.ts thing-editor/src/editor/prefabs-typing.ts', {
	cwd: __dirname + '/../..'
});
