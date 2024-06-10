const {
	ipcMain,
	dialog,
	shell
} = require('electron');

const {
	walkSync
} = require('./editor-server-utils.js');
const {watchFolders} = require('./watch');
const fsOptions = {
	encoding: 'utf8'
};

const path = require('path');

const fs = require('fs');

const fn = (fileName) => {
	if (fileName.indexOf('..') >= 0) {
		throw new Error('Attempt to access files out of Thing-Editor root folder: ' + fileName);
	}
	return path.join(__dirname, '../..', fileName);
};

/** @param mainWindow {BrowserWindow} */
module.exports = (mainWindow) => {

	const ensureDirectoryExistence = (filePath) => {
		let dirname = path.dirname(filePath);
		if (fs.existsSync(fn(dirname))) {
			return true;
		}
		fs.mkdirSync(fn(dirname), {
			recursive: true
		});
	};

	const onFileChange = (path) => {
		mainWindow.webContents.send('serverMessage', 'fs/change', path);
	};

	const notify = (text) => {
		console.log(text);
		mainWindow.webContents.send('serverMessage', 'fs/notify', text);
	};

	ipcMain.handle('fs', async (_event, command, fileName, content, ...args) => {
		let isDebug;
		try {
			switch (command) {
			case 'fs/run':
				args[0].unshift(notify);
				return await require(path.join('../..', fileName)).apply(null, args[0]);
			case 'fs/build':
				isDebug = content;
				return await require('./build.js').build(fileName, isDebug, ...args);
			}
		} catch (er) {
			console.error(er);
			er.message = er.stack;
			return er;
		}
	});

	ipcMain.on('fs', (event, command, fileName, content, ...args) => {
		let fd;
		let c;
		let success;
		let error;
		let buttons;
		let explorer;

		let ret;
		let assetsLoaderPath;

		try {
			switch (command) {
			case 'fs/delete':
				attemptFSOperation(() => {
					fs.unlinkSync(fn(fileName));
					return true;
				}, event);
				return;
			case 'fs/saveFile':
				attemptFSOperation(() => {
					ensureDirectoryExistence(fileName);
					const fileNameParsed = fn(fileName);
					fd = fs.openSync(fileNameParsed, 'w');
					fs.writeSync(fd, content);
					fs.closeSync(fd, () => { }); // eslint-disable-line @typescript-eslint/no-empty-function
					return fs.statSync(fileNameParsed).mtimeMs;
				}, event);
				return;
			case 'fs/log':
				console.log('FS-LOG: ' + fileName);
				event.returnValue = true;
				return;
			case 'fs/copyFile':
				attemptFSOperation(() => {
					const from = fn(fileName);
					const to = fn(content);
					ensureDirectoryExistence(content);
					fs.copyFileSync(from, to);
					return true;
				}, event);
				return;
			case 'fs/exists':
				event.returnValue = fs.existsSync(fn(fileName));
				return;
			case 'fs/readFileIfExists':
				if (fs.existsSync(fn(fileName))) {
					fd = fs.openSync(fn(fileName), 'r');
					c = fs.readFileSync(fd, fsOptions);
					fs.closeSync(fd, () => { }); // eslint-disable-line @typescript-eslint/no-empty-function
					event.returnValue = c;
				} else {
					event.returnValue = null;
				}
				return;
			case 'fs/setProgressBar':
				mainWindow.setProgressBar(fileName);
				event.returnValue = null;
				return;
			case 'fs/readFile':
				fd = fs.openSync(fn(fileName), 'r');
				c = fs.readFileSync(fd, fsOptions);
				fs.closeSync(fd, () => { }); // eslint-disable-line @typescript-eslint/no-empty-function
				event.returnValue = c;
				return;
			case 'fs/readDir':
				ret = walkSync(fileName, []);
				assetsLoaderPath = process.cwd() + '/' + fileName + 'assets-loader.cjs';
				if (fs.existsSync(assetsLoaderPath)) {
					require(assetsLoaderPath)(ret, content /* ProjectDesc */);
				}
				event.returnValue = ret;
				return;
			case 'fs/watchDirs':
				watchFolders(fileName, onFileChange);
				event.returnValue = true;
				return;
			case 'fs/isFilesEqual':
				event.returnValue = isFilesEqual(fn(fileName), fn(content));
				return;
			case 'fs/enumProjects':
				event.returnValue = enumProjects();
				return;
			case 'fs/getFileHash':
				event.returnValue = getFileHash(fn(fileName));
				return;
			case 'fs/exitWithResult':
				success = fileName;
				error = content;
				if (error) {
					console.error(error);
				} else if (success) {
					console.log(success);
				}
				//dialog.showMessageBox(mainWindow, 'process.exit', error || success);
				process.exit(error ? 1 : 0);
				return;
			case 'fs/showQuestion':
				buttons = Object.values(args).filter(b => b);
				event.returnValue = dialog.showMessageBoxSync(mainWindow, {
					title: fileName,
					message: content,
					buttons,
					defaultId: 0,
					cancelId: buttons.length - 1
				});
				return;
			case 'fs/browseDir':
				explorer;
				switch (require('os').platform()) {
				case 'win32': explorer = 'explorer'; break;
				case 'linux': explorer = 'xdg-open'; break;
				case 'darwin': explorer = 'open'; break;
				}
				require('child_process').spawn(explorer, [fn(fileName)], {detached: true}).unref();
				event.returnValue = true;
				return;
			case 'fs/showFile':
				shell.showItemInFolder(fn(fileName));
				event.returnValue = true;
				return;
			case 'fs/get-args':
				event.returnValue = process.argv;
				return;
			case 'fs/sounds-build':
				require('./build-sounds.js')(fileName, notify).then((res) => {
					event.returnValue = res;
				});
				return;
			default:
				event.returnValue = new Error('unknown fs command: ' + command + ': ' + (fileName || ''));
				return;
			}
		} catch (er) {
			event.returnValue = er;
		}
	});
};


/** @param ev {Electron.IpcMainEvent} */
function attemptFSOperation(cb, ev) {
	let timeout = 20;

	const attempt = () => {
		try {
			let res = cb();
			ev.returnValue = res;
		} catch (er) {
			if (timeout-- > 0) {
				setTimeout(attempt, 1000);
			} else {
				ev.returnValue = er;
			}
		}
	};
	attempt();
}

const GAMES_ROOT = path.join(__dirname, '../../games');

const enumProjects = (ret = [], subDir = '') => {
	let dir = path.join(GAMES_ROOT, subDir);
	fs.readdirSync(dir).forEach(file => {
		if (file !== '.git' && file !== 'node_modules') {
			let dirName = path.join(dir, file);
			if (fs.statSync(dirName).isDirectory()) {
				let projDescFile = dirName + '/thing-project.json';
				if (fs.existsSync(projDescFile)) {
					let desc;
					try {
						desc = JSON.parse(fs.readFileSync(projDescFile, 'utf8'));
					} catch (er) {
						throw (new Error('Error in file: ' + projDescFile + '\n' + er.message));
					}
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

let crypto;

const getFileHash = (fileName) => {
	if (!crypto) {
		crypto = require('crypto');
	}
	const hashSum = crypto.createHash('md5');
	const fileBuffer = fs.readFileSync(fileName);
	hashSum.update(fileBuffer);
	const ret = '' + hashSum.digest('base64');
	return ret.substring(0, 8).replaceAll('/', '_').replaceAll('+', '-').padStart('_', 8);
};

function isFilesEqual(a, b) {
	if (fs.statSync(a).size !== fs.statSync(b).size) {
		return false;
	}
	a = fs.readFileSync(a);
	b = fs.readFileSync(b);
	return Buffer.compare(a, b) === 0;
}
