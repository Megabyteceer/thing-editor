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
			data = data.filter((stat) => {
				let fn = stat.name;
				if (fn.toLowerCase() !== fn) {
					editor.ui.status.warn("File with upper cased characters ignored: " + fn, () => {
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
			fs.filesExt = data;
			fs.files = data.map(f => f.name).sort();
		});
	},
	deleteFile: (fileName) => {
		return fs.getJSON('/fs/delete?f=' + encodeURIComponent(fileName), true, false);
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
	getJSON(url, silently=false, async = true) {
		if (!silently) {
			editor.ui.modal.showSpinner();
		}

		let r = $.ajax({
			type: "GET",
			url,
			async,
			contentType: 'application/json',
		}).fail((a,b,c) => {handleError(a,b,c,url);});
		if (!silently) {
			r.always(editor.ui.modal.hideSpinner);
		}
		return new Promise((resolve) => {
			r.then((data) => {
				if(typeof data === 'string') {
					resolve(JSON.parse(data));
				} else {
					resolve(data);
				}
			});
		});
	},
	openFile(fileName, silently) {
		return this.getJSON(game.resourcesPath + fileName, silently);
	},
	saveFile(filename, data, silently = false, async = false) {
		if (!silently) {
			editor.ui.modal.showSpinner();
		}
		
		if(typeof data !== 'string') {
			data = JSON.stringify(data, null, '	');
		}
		
		let r = $.ajax({
			type: "POST",
			url: '/fs/savefile',
			data: JSON.stringify({data, filename}),
			contentType: 'application/json',
			async
		}).fail((a,b,c) => {handleError(a,b,c,filename);});
		if (!silently) {
			r.always(editor.ui.modal.hideSpinner);
		}
		return r;
	}
};

const fielsEditTimes = {};

export default fs;

function handleError(er, status, error, url) {
	editor.ui.modal.showError('ERROR IN FILE ' + url + ': ' + er.responseText || JSON.stringify(error || 'connection error'));
}

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
	
	if(url.startsWith(location.origin)) {
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