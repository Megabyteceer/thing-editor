import type { ComponentChild, ComponentChildren } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

const GROUP_ID_CHECKER = /[^0-9a-zA-Z_\-]/gm;

interface GroupProps {
	key: string;
	title: string;
	content: ComponentChildren;
}

function renderGroup(props: GroupProps): GroupableItem {
	let gid = 'props-group-' + props.key;
	assert(!props.key.match(GROUP_ID_CHECKER), 'Group name "' + props.key + '" contains wrong symbols', 90001);

	return R.div({ key: gid, className: 'props-group ' + gid },
		R.div({
			className: 'props-group-header',
			'groupidproperty': gid,
			onClick: toggleGroup
		}, props.title),
		R.div({ className: 'props-group-body' + (isGroupHidden(gid) ? ' hidden' : '') }, props.content)
	) as unknown as GroupableItem;
}

interface GroupableItem {
	key: string;
}

function groupArray(a: ComponentChild[], delimiter = '/', level = 0, noSort = false, idPrefix = '') {

	let groups: KeyedObject = {};
	let group;
	let groupName = '';
	let ret = [];
	const orders = new Map();

	for (let item of a as GroupableItem[]) {

		let name = item.key;
		let np = name.split(delimiter);
		let groupId = np.slice(0, level + 1).join('-_-') + idPrefix;
		if (np.length > (level + 1)) {
			if (level > 0) {
				np.splice(0, level);
			}

			groupName = np.shift() as string;

			if (!groups.hasOwnProperty(groupName)) {
				group = [];
				groups[groupName] = [];
			}
			let order = np.shift() as string;
			orders.set(item, parseFloat(order) || order);
			group = groups[groupName];
			group.__groupId = groupId;
			group.push(item);

			continue;
		}
		ret.push(item);
	}

	for (groupName in groups) {
		group = groups[groupName];
		if (!noSort) {
			group.sort((_a: GroupableItem, _b: GroupableItem) => {
				const a = orders.get(_a);
				const b = orders.get(_b);
				if (typeof a === 'number') {
					return a - b;
				}
				if (a === b) {
					return 0;
				}
				return (a > b) ? 1 : -1;
			});
		}
		let i = 0;
		while (i < ret.length && ret[i].key.endsWith(' ::')) {
			i++;
		}
		ret.splice(i, 0, renderGroup({ key: group.__groupId.replace(GROUP_ID_CHECKER, '__'), title: groupName, content: groupArray(group, delimiter, level + 1, noSort, idPrefix) }));
	}

	return ret;
}

function isGroupHidden(groupId: string) {
	return game.editor.settings.getItem(groupId, false);
}

function toggleGroup(ev: MouseEvent) {
	let groupId = (ev.target as HTMLDivElement).attributes.getNamedItem('groupidproperty')!.value as string;
	let group = (ev.target as any).closest('.props-group').querySelector('.props-group-body');
	let isHidden = group.classList.contains('hidden');
	game.editor.settings.setItem(groupId, !isHidden);
	if (isHidden) {
		group.classList.remove('hidden');
		group.style.transition = 'unset';
		group.style.opacity = 0.001;
		group.style.position = 'absolute';
		group.style.maxHeight = 'unset';
		group.style.transform = 'scaleY(0)';
		group.style.transformOrigin = 'top left';
		let height: number;
		let timer = window.setInterval(() => {
			height = group.clientHeight;
			if (height > 0) {
				clearInterval(timer);
				group.style.maxHeight = '0px';
				group.style.position = 'unset';
				group.style.opacity = 1;
				group.style.transition = 'all 0.1s';
				timer = window.setInterval(() => {
					if (group.clientHeight <= 6) {
						clearInterval(timer);
						group.style.transform = 'scaleY(1)';
						group.style.maxHeight = height + 'px';
						window.setTimeout(() => {
							group.style.maxHeight = 'unset';
						}, 114);
					}
				}, 1);
			}
		}, 1);
	} else {
		group.style.transform = 'scaleY(1)';
		group.style.transformOrigin = 'top left';
		group.style.transition = 'unset';
		group.style.maxHeight = group.clientHeight + 'px';
		group.style.transition = 'all 0.1s';
		window.setTimeout(() => {
			group.style.transform = 'scaleY(0)';
			group.style.maxHeight = '0px';
		}, 1);
		window.setTimeout(() => {
			group.classList.add('hidden');
		}, 114);
	}
}

export default { renderGroup, groupArray };

export type { GroupableItem };
