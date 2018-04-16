var fs = {
   chooseProject: (enforced) => {
        $.getJSON('/fs/projects').then((data) => {
            EDITOR.ui.modal.open(data.map(renderProjectItem), 'Choose project to open:', enforced === true)
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
        }
        $.getJSON('/fs/openProject?dir=' + dir).then((data) => {
            fs.refreshFiles();
        });
    },
    refreshFiles:(callback) => {
        $.getJSON('/fs/enum').then((data) => {
            fs.files = data;
        });
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

