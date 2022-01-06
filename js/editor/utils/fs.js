let libsByFileName = {};

let fs = {
	refreshFiles: () => {
		return fs.getJSON('/fs/enum').then((data) => {
			fs.filesExt = {};
			fs.files = {};
			if(data.hasOwnProperty('libsSettings')) {
				fs.libsSettings = data.libsSettings;
				delete data.libsSettings;
			} else {
				fs.libsSettings = {};
			}

			libsByFileName = {};
			for(let type in data) {
				let files = data[type];
				files.sort((a,b) => {
					return b.mtime - a.mtime;
				});

				fs.filesExt[type] = files;
				fs.files[type] = files.map(f => f.name).sort();
				
				for(let f of files) {
					if(f.lib) {
						libsByFileName[f.name] = f.lib;
					}
				}
			}
		});
	},
	deleteFile: (fileName, backup) => {
		return fs.getJSON('/fs/delete?f=' + encodeURIComponent(editor.game.resourcesPath + fileName) + (backup ? '&backup=1' : ''), true, false).then((data) => {
			if(data.error) {
				editor.ui.modal.showError(data.error);	
			}
		});
	},
	editFile: (fileName, line = -1, char = -1) => {
		if(editor.buildProjectAndExit) {
			return;
		}
		let now = Date.now();
		let lastEdit = filesEditTimes[fileName];
		if(lastEdit && lastEdit >  (now - 1000)) {
			return;
		}
		filesEditTimes[fileName] = now;

		let url = '/fs/edit?f=' + encodeURIComponent(fileName);
		if(line >= 0) {
			url += '&l=' + line;
		}
		if(char >= 0) {
			url += '&c=' + char;
		}
		fs.getJSON(url, true);
	},
	getJSON(url, silently=false, async = true, isJSON = true) { //eslint-disable-line no-unused-vars
		if (!silently || !async) {
			editor.ui.modal.showSpinner();
		}
		return new Promise((resolve) => {
			AJAX_ordered(url, {
				method: "GET",
				headers: isJSON ? {'Content-Type': 'application/json'} : undefined
			}, async, (returnedUrl, data) => {
				assert(url === returnedUrl, 'Response is not match with request');
				if (!silently || !async) {
					editor.ui.modal.hideSpinner();
				}
				if (data) {
					if (isJSON && (typeof data === 'string')) {
						data = JSON.parse(data);
					}
					resolve(data);
				}
			});
		});
	},
	exec(filename) {
		this.postJSON('/fs/exec', {
			filename
		});
	},
	openFile(fileName, silently) {
		return this.getJSON(editor.game.resourcesPath + fileName, silently);
	},
	postJSON(url, data, silently = false, async = false, donNotJSON = false) {//eslint-disable-line no-unused-vars
		return new Promise((resolve) => {
			if (!silently || !async) {
				editor.ui.modal.showSpinner();
			}
			AJAX_ordered(url, {
				method: "POST",
				body: donNotJSON ? data : JSON.stringify(data),
				headers: donNotJSON ? {'Content-Type': 'application/octet-stream'} : {'Content-Type': 'application/json'}
			}, async, (returnedUrl, data) => {
				assert(url === returnedUrl, 'Response is not match with request');
				
				if (!silently || !async) {
					editor.ui.modal.hideSpinner();
				}
				if(data) {
					data = JSON.parse(data);
				}
				resolve(data);
			});
		});
	},
	fileChangedExternally(fileName) {
		externallyChangedFiles[fileName] = true;
	},
	saveFile(fileName, data, silently = false, async = false) {
		if(externallyChangedFiles[fileName]) {
			editor.ui.modal.notify('Externally modified file "' + fileName + '" was overridden.');
		}
		delete externallyChangedFiles[fileName];
		if(typeof data !== 'string' && !(data instanceof Blob)) {
			data = JSON.stringify(data, fieldsFilter, '	');
		}

		let libName = fs.getFileLibName(fileName);
		if(libName) {
			editor.ui.modal.notify('Library "' + libName + '" asset modified.');
		}

		return fs.postJSON('/fs/savefile?filename=' + encodeURIComponent(fileName.startsWith('/') ? fileName : (editor.game.resourcesPath + fileName)), data, silently, async, true).then((data) => {
			if(data.error) {
				editor.ui.modal.showError(data.error);	
			}
		});
	},
	hasWrongSymbol(fileName) {
		let wrongSymbolPos = fileName.search(/[^a-zA-Z_\-\.\d\/]/gm);
		if(wrongSymbolPos >= 0) {
			return fileName[wrongSymbolPos];
		}
	},
	getFileLibName(fileName) {
		return libsByFileName[fileName];
	}
};

const fieldsFilter = (key, value) => {
	if(!key.startsWith('___')) {
		return value;
	}
};

fs.fieldsFilter = fieldsFilter;

const filesEditTimes = {};

export default fs;

const externallyChangedFiles = {};

let requestInProgress = false;
let inProgress = [];

function next() {
	if(inProgress.length) {
		(inProgress.shift())();
	}
}

function AJAX_ordered(url, options, async, callback) {
	const attempt = () => {
		if(!async) {
			requestInProgress = true;
		}
		fetch(url, options).then((response) => {
			response.text().then((txt) => {
				if(!async) {
					requestInProgress = false;
				}
				callback(url, txt);
				next();
			}).catch((err) => {
				editor.ui.modal.showFatalError('fs error: ' + err.message + '; ' + url);
			});
		});
	};

	if(requestInProgress && !async) {
		inProgress.push(attempt);
	} else {
		attempt();
	}
}