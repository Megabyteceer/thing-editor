var fs = {
    chooseProject: (enforced) => {
        fs.getJSON('/fs/projects').then((data) => {
            EDITOR.ui.modal.showModal(data.map(renderProjectItem), R.span(null, R.icon('open'), 'Choose project to open:'), enforced === true)
            .then((projDir) => {
                EDITOR.openProject(projDir);
            })
        });
    },
    refreshFiles:() => {
       return fs.getJSON('/fs/enum').then((data) => {
           fs.files = data;
       });
    },
    getJSON(url, silently) {
       if(!silently) {
           EDITOR.ui.modal.showSpinner();
       }
       var r = $.getJSON(url).fail(handleError);
       if(!silently) {
           r.always(EDITOR.ui.modal.hideSpinner);
       }
       return r;
    },
    openFile(fileName, silently) {
		return this.getJSON(fs.gameFolder+fileName, silently);
    },
    saveFile(filename, data, silently) {
        if(!silently) {
            EDITOR.ui.modal.showSpinner();
        }
		
		var r = $.ajax({
			type: "POST",
			url: '/fs/savefile',
			data: JSON.stringify({data: JSON.stringify(data, null, '	'), filename}),
			contentType : 'application/json'
		}).fail(handleError);
        if(!silently) {
            r.always(EDITOR.ui.modal.hideSpinner);
        }
        return r;
    }
}

export default fs;

function handleError(er, status, error) {
    EDITOR.ui.modal.showError(JSON.stringify(error || 'connection error'));
}

function getIconPath(desc) {
    return 'games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem (desc, i, array) {
    var icon;
    if(desc.icon){
        icon = R.img({src:getIconPath(desc)});
    }

    return R.div({className:'project-item-select clickable', key:i, onClick:() => {
        EDITOR.ui.modal.closeModal(desc.dir);
    }},icon, desc.title);
}

