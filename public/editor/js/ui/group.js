function renderGroup(props) {
    var gid = 'props-group-' + props.key;
    return R.div({key: gid, className: 'props-group ' + gid},
        R.div({
            className: 'props-group-header clickable clickable-neg',
            'data-groupid': gid,
            onClick: toggleGroup
        }, props.title),
        R.div({className: 'props-group-body' + (isGroupHidden(gid) ? ' hidden' : '')}, props.content)
    )
}

function groupArray(a, level = 0) {

    var groups = {};

    var ret = [];
    for (var item of a) {
        
        var name = item.key;
        var np = name.split('/');
        if(np.length > (level + 1)) {
            if(level > 0) {
                np.splice(0, level);
            }
            
            var groupName = np.shift();

            if(!groups.hasOwnProperty(groupName)) {
                groups[groupName] = [];
            }
            var group = groups[groupName];
            group.push(item);
            
            continue;
        }
        ret.push(item);
    }

    for(groupName in groups) {
        var group = groups[groupName];
        ret.unshift(renderGroup({key:groupName, title:groupName, content: groupArray(group, level + 1)}));
    }

    return ret;
}

function isGroupHidden(groupId) {
    return EDITOR.settings.getItem(groupId, false);
}

function toggleGroup(ev) {
    var groupId = ev.target.dataset.groupid;
    var group = $('.' + groupId + ' .props-group-body');
    var isHidden = !isGroupHidden(groupId);
    EDITOR.settings.setItem(groupId, isHidden);
    if (isHidden) {
        group.addClass('hidden');
    } else {
        group.removeClass('hidden');
    }
}

export default {renderGroup, groupArray};