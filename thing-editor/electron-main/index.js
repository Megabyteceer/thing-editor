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
		},
		opacity: 0
	};

	mainWindow = new PositionRestoreWindow(windowState, 'main');
	//mainWindow.hide();

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
			case 'fs/enumProjects':
				event.returnValue = enumProjects();
				return;
			case 'fs/ready':
				setTimeout(loadEditorIndexHTML, 300);
				event.returnValue = true;
				return;
			case 'fs/exitWithResult':
				let success = fileName;
				let error = content
				if(error) {
					console.error(error);
				} else if(success) {
					console.log(success);
				}
				dialog.showMessageBox('process.exit', error || success);
				//process.exit(error ? 1 : 0);
				return;
		}
	});

	require('./pixi-typings-patch.js')();

	const loadEditorIndexHTML = () => {
		const EDITOR_VITE_ROOT = 'http://127.0.0.1:5173/thing-editor/';
		mainWindow.loadURL(EDITOR_VITE_ROOT).catch(() => {
			dialog.showErrorBox('Thing-editor startup error.', 'Could not load ' + EDITOR_VITE_ROOT + '.\nDoes vite.js server started?');
		}).finally(() => {
			mainWindow.setOpacity(1);
		});

	};

	if(IS_DEBUG) {
		mainWindow.loadURL('http://127.0.0.1:5173/thing-editor/debugger-awaiter.html').catch((er) => {
			mainWindow.setOpacity(1);
		});
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