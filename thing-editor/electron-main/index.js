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


app.commandLine.appendSwitch('remote-debugging-port', '9223');


const fn = (fileName) => {
	if(fileName.indexOf('..') >= 0) {
		throw new Error('Attempt to access files out of Thing-Editor root folder: ' + fileName);
	}
	return path.join(__dirname, '../..', fileName);
}

const createWindow = () => {
	/** @type BrowserWindowConstructorOptions */
	let windowState;
	windowState = {
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),

			webSecurity: false
		},
		//opacity: 0
	};

	mainWindow = new PositionRestoreWindow(windowState, 'main');
	//mainWindow.hide();

	/*
		mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
			console.log(message + " " + sourceId + " (" + line + ")");
		});*/

	nativeTheme.themeSource = 'dark'

	ipcMain.on('fs', (event, command, fileName, content, ...args) => {
		console.log('command fs: ' + command + ': ' + (fileName || ''));
		let fd;
		try {
			switch(command) {
				case 'fs/toggleDevTools':
					mainWindow.webContents.toggleDevTools();
					event.returnValue = true;
					return;
				case 'fs/delete':
					fs.unlinkSync(fn(fileName));
					event.returnValue = true;
					return;
				case 'fs/saveFile':
					fd = fs.openSync(fn(fileName), 'w');
					fs.writeSync(fd, content);
					fs.closeSync(fd, () => { });
					event.returnValue = true;
					return;
				case '/fs/editFile':
					const open = require('open');
					open(fn(fileName)); // TODO file opening with line num
					/*if(line && fs.lstatSync(fn).isFile()) {
						let arg = fn + ':' + line + (char ? ':' + char : '');
						open('', {
							app: ['code', '-r', '-g', arg]
						});
					}*/
					event.returnValue = true;
					return;
				case 'fs/readFile':
					fd = fs.openSync(fn(fileName), 'r');
					let c = fs.readFileSync(fd, fsOptions);
					fs.closeSync(fd, () => { });
					event.returnValue = c;
					return;
				case 'fs/readDir':
					event.returnValue = walkSync(fileName, []);
					return;
				case 'fs/enumProjects':
					event.returnValue = enumProjects();
					return;
				case 'fs/exitWithResult':
					let success = fileName;
					let error = content
					if(error) {
						console.error(error);
					} else if(success) {
						console.log(success);
					}
					dialog.showMessageBox(mainWindow, 'process.exit', error || success);
					//process.exit(error ? 1 : 0);
					return;
				case 'fs/showQueston':
					event.returnValue = dialog.showMessageBoxSync(mainWindow, {
						title: fileName,
						message: content,
						buttons: Object.values(args),

					});
					return;
			}
		} catch(er) {
			event.returnValue = er;
		}
	});

	require('./pixi-typings-patch.js')(mainWindow);

	const loadEditorIndexHTML = () => {
		const EDITOR_VITE_ROOT = 'http://127.0.0.1:5173/thing-editor/';
		mainWindow.setOpacity(1);
		mainWindow.loadURL(EDITOR_VITE_ROOT);

	};

	if(IS_DEBUG) {

		let debuggerDetector = require('./debugger-detection');
		mainWindow.loadURL('http://127.0.0.1:5173/thing-editor/debugger-awaiter.html').catch((er) => {
			mainWindow.setOpacity(1);
			if(er.code === 'ERR_CONNECTION_REFUSED') {
				dialog.showErrorBox(mainWindow, 'Thing-editor startup error.', 'Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
			}
		});
		debuggerDetector.once('debugger-ready', loadEditorIndexHTML);
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

const GAMES_ROOT = path.join(__dirname, '../../games');

const enumProjects = (ret = [], subDir = '') => {
	let dir = path.join(GAMES_ROOT, subDir);
	fs.readdirSync(dir).forEach(file => {
		if(file !== '.git' && file !== 'node_modules') {
			let dirName = path.join(dir, file);
			if(fs.statSync(dirName).isDirectory()) {
				let projDescFile = dirName + '/thing-project.json';
				if(fs.existsSync(projDescFile)) {
					let desc = JSON.parse(fs.readFileSync(projDescFile, 'utf8'));
					desc.dir = subDir ? (subDir + '/' + file) : file;
					ret.push(desc);
				} else {
					enumProjects(ret, subDir ? (subDir + '/' + file) : file);
				}
			}
		}
	});
	return ret;
};