const {
	app,
	BrowserWindow,
	nativeTheme,
	dialog,
	globalShortcut,
	shell
} = require('electron');

(() => {
	/** @type BrowserWindow */
	let mainWindow;

	if (!app.requestSingleInstanceLock()) {
		app.quit();
		return;
	}
	app.on('second-instance', () => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});

	function isClosingBlocked() {
		if (mainWindow.__currentProgressOperation) {
			const res = dialog.showMessageBoxSync(mainWindow, {
				title: 'Are you sure?',
				message: mainWindow.__currentProgressOperation + ' in progress. ' + Math.round(mainWindow.__currentProgress * 100) + '% of 100% complete',
				buttons: [
					'Abort ' + mainWindow.__currentProgressOperation + ' and close',
					'Wait for ' + mainWindow.__currentProgressOperation + ' finish',
				],
				defaultId: 1,
				cancelId: 0
			});
			return res === 1;
		}
	}

	const {exec} = require('child_process');

	const originalLog = console.log.bind(console);

	console.log = (txt) => {
		try {
			originalLog(txt);
		} catch (_er) { }
	};

	const IS_DEBUG = process.argv.includes('debugger-detection-await');

	process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';


	const path = require('path');
	const os = require('os');

	const getPositionRestoreWindow = require('./thing-editor-window.js');

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
					'--user-data-dir=' + path.join(os.tmpdir(), 'chrome-user-tmp-data')
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

		if (process.argv.some(a => a.startsWith('--build-and-exit'))) {
			mainWindow.webContents.addListener('console-message', (_event, _level, message, line, sourceId) =>{
				console.log('console-message:');
				console.log(message);
				console.log(sourceId);
				console.log(line);
			});
		}

		mainWindow.on('focus', () => {
			globalShortcut.register('F5', () => {
				if (!isClosingBlocked()) {
					mainWindow.reload();
				}
			});
			globalShortcut.register('F12', () => { // On windows set HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\AeDebug\UserDebuggerHotKey to '2f' value to make F12 it work
				mainWindow.webContents.openDevTools();
			});
		});
		mainWindow.on('blur', () => {
			globalShortcut.unregisterAll();
		});

		mainWindow.on('close', (ev) => {
			if (isClosingBlocked()) {
				ev.preventDefault();
			}
		});

		nativeTheme.themeSource = 'dark';

		require('./server-fs.js')(mainWindow);

		const EDITOR_VITE_ROOT = 'http://localhost:5173/thing-editor/';
		const loadEditorIndexHTML = () => {
			mainWindow.setOpacity(1);
			mainWindow.loadURL(EDITOR_VITE_ROOT);
		};

		if (IS_DEBUG) {

			//let debuggerDetector = require('./debugger-detection');
			mainWindow.loadURL('http://localhost:5173/thing-editor/debugger-awaiter.html').catch((er) => {
				mainWindow.setOpacity(1);
				if (er.code === 'ERR_CONNECTION_REFUSED') {
					console.error('Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
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
			if (BrowserWindow.getAllWindows().length === 0) createWindow();
		});
	});

	app.on('render-process-gone', (_event, _webContents, details) => {
		console.log('render-process-gone:');
		console.log(JSON.stringify(details));
		app.quit();
	});

	app.on('window-all-closed', () => {
		console.log('thing-editor exit');
		app.quit();
	});

	exec('git update-index --assume-unchanged thing-editor/src/editor/current-scene-typings.d.ts thing-editor/src/editor/prefabs-typing.ts', {
		cwd: __dirname + '/../..'
	});
})();
