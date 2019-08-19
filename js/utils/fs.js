import game from "thing-engine/js/game.js";

let fs = {
	chooseProject: (enforced) => {
		editor.ui.viewport.stopExecution();
		fs.getJSON('/fs/projects').then((data) => {
			editor.ui.modal.showModal(data.map(renderProjectItem), R.span(null, R.icon('open'), 'Choose project to open:'), enforced === true)
				.then((projDir) => {
					if(projDir) {
						editor.openProject(projDir);
					}
				});
		});
	},
	refreshFiles: () => {
		return fs.getJSON('/fs/enum').then((data) => {
			data.sort((a,b)=>{
				return b.mtime - a.mtime;
			});
			if(editor.game.projectDesc && editor.game.projectDesc.__allowUpperCaseFiles) {
				data = data.filter((stat) => {
					let fn = stat.name;
					if (fn.toLowerCase() !== fn) {
						editor.ui.status.warn("File with upper cased characters ignored: " + fn, 30029, () => {
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

			fs.filesExt = data;
			fs.files = data.map(f => f.name).sort();
		});
	},
	deleteFile: (fileName) => {
		return fs.getJSON('/fs/delete?f=' + encodeURIComponent(fileName), true, false).then((data) => {
			if(data.error) {
				editor.ui.modal.showError(data.error);	
			}
		});
	},
	editFile: (fileName, line = -1, char = -1) => {

		let now = Date.now();
		let lastEdit = fielsEditTimes[fileName];
		if(lastEdit && lastEdit >  (now - 10000)) {
			return;
		}
		fielsEditTimes[fileName] = now;

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
				assert(url === returnedUrl, 'Responce is not match with request');
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
	openFile(fileName, silently) {
		return this.getJSON(game.resourcesPath + fileName, silently);
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
				assert(url === returnedUrl, 'Responce is not match with request');
				
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
		return fs.postJSON('/fs/savefile', {data, filename}, silently, async);
	}
};

const fieldsFilter = (key, value) => {
	if(!key.startsWith('___')) {
		return value;
	}
};

fs.fieldsFilter = fieldsFilter;

const fielsEditTimes = {};

export default fs;

function getIconPath(desc) {
	return '/games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem(desc, i) {
	let icon;
	if (desc.icon) {
		icon = R.img({src: getIconPath(desc)});
	}
	
	return R.div({
		className: 'project-item-select clickable', key: i, onClick: () => {
			editor.ui.modal.hideModal(desc.dir);
		}
	}, icon, desc.title);
}

let originalFetch = window.fetch;

window.fetch = (url, options) => {
	
	url = canonicalize(url);
	
	if(!editor.projectDesc.__proxyFetchesViaNodeServer || url.startsWith(location.origin)) {
		return originalFetch(url, options);
	} else {
		let headers = new Headers();
		headers.append("Content-Type", "application/json");
		return originalFetch('/fs/fetch', {
			method: 'POST',
			headers,
			body: JSON.stringify({url, options})
		}).then((r) => {
			return r;
		});
	}
};

function canonicalize(url) {
	let div = document.createElement('div');
	div.innerHTML = "<a></a>";
	div.firstChild.href = url; // Ensures that the href is properly escaped
	let html = div.innerHTML;
	div.innerHTML = html; // Run the current innerHTML back through the parser
	return div.firstChild.href;
}

let requestNum = 0;
let _ajaxHandlers = [];
let worker = new Worker("js/utils/fs-worker.js");
worker.onmessage = function (event) {
	let d = JSON.parse(event.data);
	if (d.error) {
		editor.ui.modal.showError('File system worker error: ' + JSON.stringify(d));
		_ajaxHandlers.shift()(d.url);
	} else {
		_ajaxHandlers.shift()(d.url, d.data);
	}
};

function AJAX(options, callback) {
	_ajaxHandlers.push(callback);
	options.requestNum = requestNum++;
	worker.postMessage(JSON.stringify(options));
}