import type { ComponentChild, ComponentChildren } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import game from 'thing-editor/src/engine/game';

const GROUP_ID_CHECKER = /[^0-9a-zA-Z_\-]/gm;

function renderGroup(group: GroupFolderData, idPrefix:string): ComponentChildren | ComponentChildren[] {
	if (Array.isArray(group) && group.__folderName) {
		let key = 'props-group-' + idPrefix + group.__folderName.replace(GROUP_ID_CHECKER, '__');
		return R.div({ key, className: 'props-group ' + key },
			R.div({
				className: 'props-group-header',
				'groupidproperty': key,
				onClick: toggleGroup
			}, group.__subFolderName),
			R.div({ className: 'props-group-body' + (isGroupHidden(key) ? ' hidden' : '') },
				group.map(i => renderGroup(i, idPrefix)))
		);
	}
	return group;
}

interface GroupAbleItem {
	key: string;
}

declare class GroupFolderData extends Array {
	__folderName: string;
	__subFolderName: string;
}


let groupsArray: GroupFolderData;
let groups: KeyedMap<GroupFolderData>;
const getGroupByFolderName = (path:string[]) => {
	let folderName = '';
	let group = groupsArray;
	while (path.length) {
		const subFolderName = path.shift()!;
		folderName += subFolderName + '/';
		if (!groups.hasOwnProperty(folderName)) {
			const g = [] as any;
			group.push(g);
			group = g;
			group.__folderName = folderName;
			group.__subFolderName = subFolderName;
			groupsArray.push();
			groups[folderName] = group;
		} else {
			group = groups[folderName];
		}
	}
	return group;
};

function groupArray(a: ComponentChild[], idPrefix:string, delimiter = '/') {
	groups = {};
	groupsArray = [] as any;

	for (let item of a as GroupAbleItem[]) {

		let name = item.key;
		const path = name.split(delimiter);
		path.pop();
		getGroupByFolderName(path).push(item);
	}
	return groupsArray.map(i => renderGroup(i, idPrefix));
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

export type { GroupAbleItem as GroupAbleItem, GroupFolderData };
