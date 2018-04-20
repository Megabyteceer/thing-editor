var fs = {
    chooseProject: (enforced) => {
        fs.getJSON('/fs/projects', (data) => {
            EDITOR.ui.modal.open(data.map(renderProjectItem), R.span(null, R.icon('open'), 'Choose project to open:'), enforced === true)
        });
    },
    openProject:(desc) => {
        var dir;
        if(desc) {
            dir = desc.dir;
        }
        else {
            dir = EDITOR.settings.getItem('last-opened-project');
        }
        if(!dir) {
            fs.chooseProject(true);
        } else {
             fs.getJSON('/fs/openProject?dir=' + dir, (data) => {
                fs.refreshFiles(() => {
                    EDITOR.settings.setItem('last-opened-project', dir);
                    fs.gameFolder = '/games/' + dir + '/';
                    EDITOR.reloadAll();
                });
            });
        }
    },
    refreshFiles:(callback) => {
       fs.getJSON('/fs/enum', (data) => {
           fs.files = data;
           callback();
       });
    },
    getJSON(url, callback, silently) {
       if(!silently) {
           EDITOR.ui.modal.showSpinner();
       }
       var r = $.getJSON(url).then(callback);
       if(!silently) {
           r.always(EDITOR.ui.modal.hideSpinner);
       }
    },
    openFile(fileName, callback, silently) {
		this.getJSON(fs.gameFolder+fileName, callback, silently);
    },
    saveFile(filename, data, callback, silently) {
        if(!silently) {
            EDITOR.ui.modal.showSpinner();
        }
		
		var r = $.ajax({
			type: "POST",
			url: '/fs/savefile',
			data: JSON.stringify({data: JSON.stringify(data, null, '	'), filename}),
			contentType : 'application/json'
		}).then(callback);
        if(!silently) {
            r.always(EDITOR.ui.modal.hideSpinner);
        }
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
        EDITOR.ui.modal.close();
        fs.openProject(desc);
    }},icon, desc.title);
}

