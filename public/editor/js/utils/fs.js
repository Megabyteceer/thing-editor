var fs = {
    chooseProject: (enforced) => {
        fs.load('/fs/projects', (data) => {
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
             fs.load('/fs/openProject?dir=' + dir, (data) => {
                fs.refreshFiles(() => {
                    EDITOR.settings.setItem('last-opened-project', dir);
                    fs.gameFolder = '/games/' + dir + '/';
                    EDITOR.reloadAll();
                });
            });
        }
    },
    refreshFiles:(callback) => {
       fs.load('/fs/enum', (data) => {
           fs.files = data;
           callback();
       });
    },
    get(url, callback, silently) {
       if(!silently) {
           EDITOR.ui.modal.showSpinner();
       }
       var r = $.getJSON(url).then(callback);
       if(!silently) {
           r.always(EDITOR.ui.modal.hideSpinner);
       }
    },
    saveFile(filename, body, callback, silently) {
        if(!silently) {
            EDITOR.ui.modal.showSpinner();
        }
        var r = $.post('/fs/savefile', {
            body,
            filename
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

