import ws from "./socket.js";
import Group from "../ui/group.js";

let fs = {
	chooseProject: (enforced) => {
		editor.ui.viewport.stopExecution();
		fs.getJSON('/fs/projects').then((data) => {
			editor.ui.modal.showModal(R.div({className:'project-open-chooser'}, Group.groupArray(data.map(renderProjectItem))), R.span(null, R.icon('open'), 'Choose project to open:'), enforced)
				.then((projDir) => {
					if(projDir) {
						editor.openProject(projDir);
					}
				});
		});
	},
	refreshFiles: () => {
		return fs.getJSON('/fs/enum').then((data) => {
			fs.filesExt = {};
			fs.files = {};
			for(let type in data) {
				let files = data[type];
				files.sort((a,b) => {
					return b.mtime - a.mtime;
				});

				if(editor.game.projectDesc && !editor.game.projectDesc.__allowUpperCaseFiles) {
					files = files.filter((stat) => {
						let fn = stat.name;
						if (fn.toLowerCase() !== fn) {
							editor.ui.status.warn("File with upper cased characters ignored: " + fn, 32019, () => {
								let a = fn.split('/');
								let path = [];
								for(let p of a) {
									if(p !== p.toLowerCase()) {
										break;
									} else {
										path.push(p);
									}
								}
								fs.editFile(path.join('/'));
							});
							return false;
						}
						return true;
					});
				}

				fs.filesExt[type] = files;
				fs.files[type] = files.map(f => f.name).sort();
			}
		});
	},
	deleteFile: (fileName) => {
		ws.ignoreFileChanging(fileName);
		return fs.getJSON('/fs/delete?f=' + encodeURIComponent(editor.game.resourcesPath + fileName), true, false).then((data) => {
			ws.notIgnoreFileChanging(fileName);
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
		if(lastEdit && lastEdit >  (now - 10000)) {
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
			AJAX({
				type: "GET",
				url,
				contentType: isJSON ? 'application/json' : undefined,
				async
			}, (returnedUrl, data) => {
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
	postJSON(url, data, silently = false, async = false) {//eslint-disable-line no-unused-vars
		return new Promise((resolve) => {
			if (!silently || !async) {
				editor.ui.modal.showSpinner();
			}

			AJAX({
				type: "POST",
				url: url,
				data: JSON.stringify(data),
				contentType: 'application/json',
				async
			}, (returnedUrl, data) => {
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
	saveFile(filename, data, silently = false, async = false) { 
		if(typeof data !== 'string') {
			data = JSON.stringify(data, fieldsFilter, '	');
		}
		ws.ignoreFileChanging(filename);
		return fs.postJSON('/fs/savefile', {data, filename : editor.game.resourcesPath + filename}, silently, async).then(() => {
			ws.notIgnoreFileChanging(filename);
		});
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

function getIconPath(desc) {
	return '/games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem(desc, i) {
	let icon;
	if (desc.icon) {
		icon = R.img({src: getIconPath(desc)});
	}
	let key = desc.__group ? desc.__group + '/' + i : i;
	return R.div({
		className: 'project-item-select clickable', key, onClick: () => {
			editor.ui.modal.hideModal(desc.dir);
		}
	}, icon, desc.title);
}

let requestNum = 0;
let _ajaxHandlers = [];
let worker = new Worker("js/utils/fs-worker.js");
worker.onmessage = function (event) {
	let d = JSON.parse(event.data);
	if (d.error) {
		editor.ui.modal.showError('File system worker error: ' + JSON.stringify(d));
		_ajaxHandlers.shift()(d.request.url);
	} else {
		_ajaxHandlers.shift()(d.url, d.data);
	}
};

function AJAX(options, callback) {
	_ajaxHandlers.push(callback);
	options.requestNum = requestNum++;
	worker.postMessage(JSON.stringify(options));
}