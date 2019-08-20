function renderGroup(props) {
	let gid = 'props-group-' + props.key;
					
	const nameChecker = /[^0-9a-zA-Z_\.\-]/gm;
	assert(!props.key.match(nameChecker), 'Group name "' + props.key + '" contains wrong symbols', 99999);

	return R.div({key: gid, className: 'props-group ' + gid},
		R.div({
			className: 'props-group-header clickable clickable-neg',
			'data-groupid': gid,
			onClick: toggleGroup
		}, props.title),
		R.div({className: 'props-group-body' + (isGroupHidden(gid) ? ' hidden' : '')}, props.content)
	);
}

function groupArray(a, delimitter = '/', level = 0) {
	
	let groups = {};
	let group;
	let groupName;
	let ret = [];
	const orders = new Map();

	for (let item of a) {
		
		let name = item.key;
		let np = name.split(delimitter);
		if (np.length > (level + 1)) {
			if (level > 0) {
				np.splice(0, level);
			}
			
			groupName = np.shift();
			
			if (!groups.hasOwnProperty(groupName)) {
				groups[groupName] = [];
			}
			let order = np.shift();
			orders.set(item, parseFloat(order) || order);
			group = groups[groupName];
			group.push(item);
			
			continue;
		}
		ret.push(item);
	}

	for (groupName in groups) {
		group = groups[groupName];
		group.sort((a,b) => {
			a = orders.get(a);
			b = orders.get(b);
			if(typeof a === 'number') {
				return a - b;
			}
			if(a === b) {
				return 0;
			}
			return (a > b) ? 1 : -1;
		});
		let i = 0;
		while(i < ret.length && ret[i].key.endsWith(' ::')) {
			i++;
		}
		ret.splice(i, 0, renderGroup({key: groupName, title: groupName, content: groupArray(group, delimitter, level + 1)}));
	}

	return ret;
}

function isGroupHidden(groupId) {
	return editor.settings.getItem(groupId, false);
}

function toggleGroup(ev) {
	let groupId = ev.target.dataset.groupid;
	let group = document.querySelector('.' + groupId + ' .props-group-body');
	let isHidden = !isGroupHidden(groupId);
	editor.settings.setItem(groupId, isHidden);
	if (isHidden) {
		group.classList.add('hidden');
	} else {
		group.classList.remove('hidden');
	}
}

export default {renderGroup, groupArray};