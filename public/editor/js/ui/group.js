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

function groupArray(a) {

    var groups = {};

    var ret = [];
    for (var item of a) {
        debugger;
        var name = item.key;
        var slashIndex = name.indexOf('/');
        if(slashIndex > 0) {
            var groupName = name.substr(0, slashIndex);
            item.key = name.substr(slashIndex + 1);

            if(!groups.hasOwnProperty(name)) {
                groups[name] = [];
            }
            var group = groups[name];
            group.push(item);

        } else {
            ret.push(item);
        }
    }

    for(groupName in groups) {
        var group = groups[groupName];
        ret.unshift(renderGroup({key:groupName, title:groupName, content: groupArray(group)}));
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