var fs = {
    chooseProject: (enforced) => {
        fs.getJSON('/fs/projects', (data) => {
            EDITOR.ui.modal.showModal(data.map(renderProjectItem), R.span(null, R.icon('open'), 'Choose project to open:'), enforced === true)
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
       var r = $.getJSON(url).fail;
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
		}).fail show error message;
        if(!silently) {
            r.always(EDITOR.ui.modal.hideSpinner);
        }
        return r;
    }
}

export default fs;

function getIconPath(desc) {
    return 'games/' + desc.dir + '/' + desc.icon;
}

function renderProjectItem (desc, i, array) {
    var icon;
    if(desc.icon){
        icon = R.img({src:getIconPath(desc)});
    }

    return R.div({className:'project-item-select clickable', key:i, onClick:() => {
        EDITOR.ui.modal.closeModal();
        fs.openProject(desc.dir);
    }},icon, desc.title);
}

