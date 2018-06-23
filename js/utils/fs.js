let fs = {
	chooseProject: (enforced) => {
		fs.getJSON('/fs/projects').then((data) => {
			editor.ui.modal.showModal(data.map(renderProjectItem), R.span(null, R.icon('open'), 'Choose project to open:'), enforced === true)
			.then((projDir) => {
				editor.openProject(projDir);
			})
		});
	},
	refreshFiles: () => {
		return fs.getJSON('/fs/enum').then((data) => {
			data.sort();
			fs.files = data;
		});
	},
	deleteFile: (fileName) => {
		return fs.getJSON('/fs/delete?f=' + encodeURIComponent(fileName));
	},
	editFile: (fileName) => {
		return fs.getJSON('/fs/edit?f=' + encodeURIComponent(fileName), true);
	},
	getJSON(url, silently) {
		if (!silently) {
			editor.ui.modal.showSpinner();
		}
		let r = $.getJSON(url).fail((a,b,c) => {handleError(a,b,c,url)});
		if (!silently) {
			r.always(editor.ui.modal.hideSpinner);
		}
		return r;
	},
	openFile(fileName, silently) {
		return this.getJSON(fs.gameFolder + fileName, silently);
	},
	saveFile(filename, data, silently) {
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
			contentType: 'application/json'
		}).fail((a,b,c) => {handleError(a,b,c,filename)});
		if (!silently) {
			r.always(editor.ui.modal.hideSpinner);
		}
		return r;
	}
};

export default fs;

function handleError(er, status, error, url) {
	editor.ui.modal.showError('ERROR IN FILE ' + url + ': ' + er.responseText || JSON.stringify(error || 'connection error'));
}

function getIconPath(desc) {
	return '/games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem(desc, i, array) {
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
	
	if(url.startsWith(location.href)) {
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
	div.innerHTML = div.innerHTML; // Run the current innerHTML back through the parser
	return div.firstChild.href;
}