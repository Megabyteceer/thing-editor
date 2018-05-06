var fs = {
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
	getJSON(url, silently) {
		if (!silently) {
			editor.ui.modal.showSpinner();
		}
		var r = $.getJSON(url).fail(handleError);
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
		
		var r = $.ajax({
			type: "POST",
			url: '/fs/savefile',
			data: JSON.stringify({data: JSON.stringify(data, numberLengthLimitter, '	'), filename}),
			contentType: 'application/json'
		}).fail(handleError);
		if (!silently) {
			r.always(editor.ui.modal.hideSpinner);
		}
		return r;
	}
}

const numberLengthLimitter = (key, val) => {
	if (typeof val === 'number') {
		var s = val.toString();
		var s2 = val.toFixed(editor.ClassesLoader.getFieldDigitsLength(key));
		return (s.length < s2.length) ? s : s2;
	}
	return val;
}

export default fs;

function handleError(er, status, error) {
	editor.ui.modal.showError(JSON.stringify(error || 'connection error'));
}

function getIconPath(desc) {
	return 'games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem(desc, i, array) {
	var icon;
	if (desc.icon) {
		icon = R.img({src: getIconPath(desc)});
	}
	
	return R.div({
		className: 'project-item-select clickable', key: i, onClick: () => {
			editor.ui.modal.closeModal(desc.dir);
		}
	}, icon, desc.title);
}

