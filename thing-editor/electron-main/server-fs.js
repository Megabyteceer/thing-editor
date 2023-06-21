const {
	ipcMain,
	dialog
} = require('electron');

const {
	walkSync
} = require("./editor-server-utils.js");
const {watchFolders, ignoreWatch} = require("./watch");
const fsOptions = {
	encoding: 'utf8'
};

const path = require('path');

const fs = require('fs');

const fn = (fileName) => {
	if(fileName.indexOf('..') >= 0) {
		throw new Error('Attempt to access files out of Thing-Editor root folder: ' + fileName);
	}
	return path.join(__dirname, '../..', fileName);
}

module.exports = (mainWindow) => {

	const notify = (message) => {
		mainWindow.webContents.send('serverMessage', 'fs/notify', message);
	}

	const ensureDirectoryExistence = (filePath) => {
		let dirname = path.dirname(filePath);
		if(fs.existsSync(fn(dirname))) {
			return true;
		}
		ensureDirectoryExistence(dirname);
		fs.mkdirSync(fn(dirname));
	}

	const onFileChange = (path) => {
		mainWindow.webContents.send('serverMessage', 'fs/change', path);
	}

	ipcMain.on('fs', (event, command, fileName, content, ...args) => {

		let fd;
		try {
			switch(command) {
				case 'fs/toggleDevTools':
					mainWindow.webContents.openDevTools();
					event.returnValue = true;
					return;
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
						fs.closeSync(fd, () => { });
						return fs.statSync(fileNameParsed).mtimeMs;
					}, event);
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
				case 'fs/readFile':
					fd = fs.openSync(fn(fileName), 'r');
					let c = fs.readFileSync(fd, fsOptions);
					fs.closeSync(fd, () => { });
					event.returnValue = c;
					return;
				case 'fs/readDir':
					event.returnValue = walkSync(fileName, []);
					return;
				case 'fs/watchDirs':
					event.returnValue = watchFolders(fileName, onFileChange);
					return;
				case 'fs/isFilesEqual':
					event.returnValue = isFilesEqual(fn(fileName), fn(content));
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
					//dialog.showMessageBox(mainWindow, 'process.exit', error || success);
					process.exit(error ? 1 : 0);
					return;
				case 'fs/showQuestion':
					const buttons = Object.values(args).filter(b => b);
					event.returnValue = dialog.showMessageBoxSync(mainWindow, {
						title: fileName,
						message: content,
						buttons,
						defaultId: 0,
						cancelId: buttons.length - 1
					});
					return;
				case 'fs/browseDir':
					let explorer;
					switch(require('os').platform()) {
						case "win32": explorer = "explorer"; break;
						case "linux": explorer = "xdg-open"; break;
						case "darwin": explorer = "open"; break;
					}
					require('child_process').spawn(explorer, [fn(fileName)], {detached: true}).unref();
					event.returnValue = true;
					return;
				case 'fs/build':
					const isDebug = content;
					require('./build.js').build(fileName, isDebug, args[0]).then((res) => {
						let ret = true;
						try {
							ret = JSON.stringify(res || true);
						} catch(_er) {
							console.error(_er);
						};
						mainWindow.webContents.send('serverMessage', 'fs/buildResult', ret);
					}).catch((er) => {
						mainWindow.webContents.send('serverMessage', 'fs/buildResult', er);
					});
					event.returnValue = true;
					return;
				case 'fs/sounds-build':
					require('./build-sounds.js')(fileName, notify).then((res) => {
						event.returnValue = JSON.stringify(res);
					});
					return;
				default:
					event.returnValue = new Error('unknown fs command: ' + command + ': ' + (fileName || ''));
					return;
			}
		} catch(er) {
			event.returnValue = er;
		}
	});
}


/** @param ev {Electron.IpcMainEvent} */
function attemptFSOperation(cb, ev) {
	let timeout = 20;

	const attempt = () => {
		try {
			let res = cb();
			ev.returnValue = res;
		} catch(er) {
			if(timeout-- > 0) {
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

function isFilesEqual(a, b) {
	if(fs.statSync(a).size !== fs.statSync(b).size) {
		return false;
	}
	a = fs.readFileSync(a);
	b = fs.readFileSync(b);
	return Buffer.compare(a, b) === 0;
}